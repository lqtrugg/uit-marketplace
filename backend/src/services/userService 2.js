import { getDataSource } from '../core/dataSource.js';
import { PostEntity } from '../entities/PostEntity.js';
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
  const postRepo = dataSource.getRepository(PostEntity);
  const user = await userRepo.findOneBy({ googleId: normalizedGoogleId });

  if (!user) {
    return null;
  }

  const postCount = await postRepo.countBy({ authorGoogleId: normalizedGoogleId });
  const latestPost = await postRepo.findOne({
    where: {
      authorGoogleId: normalizedGoogleId
    },
    order: {
      createdAt: 'DESC'
    }
  });

  return {
    user: normalizeUser(user),
    activity: {
      postCount,
      lastPostAt: latestPost ? latestPost.createdAt : null
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
  const postRepo = dataSource.getRepository(PostEntity);
  const candidates = await userRepo.find({
    order: {
      lastLoginAt: 'DESC'
    },
    take: Math.max(normalizedLimit * 3, normalizedLimit)
  });
  const enriched = await Promise.all(
    candidates.map(async (user) => {
      const postCount = await postRepo.countBy({ authorGoogleId: user.googleId });
      const latestPost = await postRepo.findOne({
        where: {
          authorGoogleId: user.googleId
        },
        order: {
          createdAt: 'DESC'
        }
      });

      return {
        ...normalizeUser(user),
        postCount,
        lastPostAt: latestPost ? latestPost.createdAt : null
      };
    })
  );

  return enriched
    .sort((left, right) => {
      if (right.postCount !== left.postCount) {
        return right.postCount - left.postCount;
      }

      return new Date(right.lastLoginAt).getTime() - new Date(left.lastLoginAt).getTime();
    })
    .slice(0, normalizedLimit);
}
