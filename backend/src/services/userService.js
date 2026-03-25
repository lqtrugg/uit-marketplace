import { getDataSource } from '../core/dataSource.js';
import { ItemEntity } from '../entities/ItemEntity.js';
import { UserEntity } from '../entities/UserEntity.js';

function normalizeUser(user) {
  return {
    googleId: user.googleId,
    email: user.email,
    name: user.name,
    picture: user.picture,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

function normalizeLimit(rawLimit) {
  const parsed = Number.parseInt(rawLimit || '10', 10);

  if (Number.isNaN(parsed)) {
    return 10;
  }

  return Math.min(Math.max(parsed, 1), 30);
}

function normalizeDisplayName(rawName) {
  if (rawName === undefined) {
    return undefined;
  }

  if (typeof rawName !== 'string') {
    throw new Error('Display name must be a string.');
  }

  const value = rawName.trim();

  if (value.length < 2 || value.length > 80) {
    throw new Error('Display name must be between 2 and 80 characters.');
  }

  return value;
}

function normalizePictureUrl(rawPicture) {
  if (rawPicture === undefined) {
    return undefined;
  }

  if (typeof rawPicture !== 'string') {
    throw new Error('Picture URL must be a string.');
  }

  const value = rawPicture.trim();

  if (!value) {
    return '';
  }

  if (value.length > 500) {
    throw new Error('Picture URL is too long.');
  }

  if (!/^https?:\/\//i.test(value) && !value.startsWith('/')) {
    throw new Error('Picture URL must start with http://, https:// or /.');
  }

  return value;
}

export async function getUserProfileByGoogleId(googleId) {
  const normalizedGoogleId = typeof googleId === 'string' ? googleId.trim() : '';

  if (!normalizedGoogleId) {
    return null;
  }

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(UserEntity);
  const itemRepo = dataSource.getRepository(ItemEntity);
  const user = await userRepo.findOneBy({ googleId: normalizedGoogleId });

  if (!user) {
    return null;
  }

  const listingCount = await itemRepo.countBy({ sellerGoogleId: normalizedGoogleId });
  const latestListing = await itemRepo.findOne({
    where: {
      sellerGoogleId: normalizedGoogleId
    },
    order: {
      createdAt: 'DESC'
    }
  });

  return {
    user: normalizeUser(user),
    activity: {
      listingCount,
      lastListingAt: latestListing ? latestListing.createdAt : null
    }
  };
}

export async function updateAuthenticatedUserProfile({ googleId, name, picture }) {
  const normalizedGoogleId = typeof googleId === 'string' ? googleId.trim() : '';

  if (!normalizedGoogleId) {
    throw new Error('Authentication required.');
  }

  const nextName = normalizeDisplayName(name);
  const nextPicture = normalizePictureUrl(picture);
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(UserEntity);
  const user = await userRepo.findOneBy({ googleId: normalizedGoogleId });

  if (!user) {
    throw new Error('User not found.');
  }

  if (nextName !== undefined) {
    user.name = nextName;
  }

  if (nextPicture !== undefined) {
    user.picture = nextPicture;
  }

  const saved = await userRepo.save(user);
  return normalizeUser(saved);
}

export async function getTopActiveUsers(limit) {
  const normalizedLimit = normalizeLimit(limit);
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(UserEntity);
  const itemRepo = dataSource.getRepository(ItemEntity);
  const candidates = await userRepo.find({
    order: {
      lastLoginAt: 'DESC'
    },
    take: Math.max(normalizedLimit * 3, normalizedLimit)
  });
  const enriched = await Promise.all(
    candidates.map(async (user) => {
      const listingCount = await itemRepo.countBy({ sellerGoogleId: user.googleId });
      const latestListing = await itemRepo.findOne({
        where: {
          sellerGoogleId: user.googleId
        },
        order: {
          createdAt: 'DESC'
        }
      });

      return {
        ...normalizeUser(user),
        listingCount,
        lastListingAt: latestListing ? latestListing.createdAt : null
      };
    })
  );

  return enriched
    .sort((left, right) => {
      if (right.listingCount !== left.listingCount) {
        return right.listingCount - left.listingCount;
      }

      return new Date(right.lastLoginAt).getTime() - new Date(left.lastLoginAt).getTime();
    })
    .slice(0, normalizedLimit);
}
