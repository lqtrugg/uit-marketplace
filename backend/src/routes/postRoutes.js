import { Router } from 'express';
import { requireAuthenticatedUser } from '../services/authService.js';
import { createItem, deleteItem } from '../services/itemService.js';
import { getDataSource } from '../core/dataSource.js';
import { ItemEntity } from '../entities/ItemEntity.js';
import { HcmWardEntity } from '../entities/HcmWardEntity.js';

const postRoutes = Router();

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value || ''), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function mapItemToPost(item) {
  return {
    id: item.id,
    content: item.description || item.itemName || '',
    authorGoogleId: item.sellerGoogleId,
    authorName: item.sellerName,
    authorEmail: item.sellerEmail,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

async function resolveDefaultWardCode() {
  const dataSource = await getDataSource();
  const wardRepo = dataSource.getRepository(HcmWardEntity);
  const preferred = await wardRepo.findOneBy({ wardCode: 790001 });

  if (preferred?.wardCode) {
    return preferred.wardCode;
  }

  const fallback = await wardRepo
    .createQueryBuilder('ward')
    .orderBy('ward.wardCode', 'ASC')
    .take(1)
    .getOne();

  if (!fallback?.wardCode) {
    throw new Error('No ward data available. Run ward sync first.');
  }

  return fallback.wardCode;
}

postRoutes.get('/', async (request, response) => {
  try {
    const limit = parsePositiveInteger(request.query?.limit) || 10;
    const safeLimit = Math.min(limit, 100);
    const dataSource = await getDataSource();
    const itemRepo = dataSource.getRepository(ItemEntity);
    const items = await itemRepo
      .createQueryBuilder('item')
      .orderBy('item.createdAt', 'DESC')
      .take(safeLimit)
      .getMany();

    return response.json({
      posts: items.map(mapItemToPost),
      nextCursor: ''
    });
  } catch (error) {
    console.error('[POSTS_LIST_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load posts.' });
  }
});

postRoutes.post('/', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const content = normalizeText(request.body?.content);

    if (!content) {
      return response.status(400).json({ error: 'Post content is required.' });
    }

    const wardCode = await resolveDefaultWardCode();
    const item = await createItem({
      user,
      payload: {
        itemName: content.slice(0, 120) || 'Quick Post',
        description: content,
        durationDays: 7,
        durationHours: 0,
        wardCode,
        reasonForSelling: 'Quick post from Post Service',
        price: 'Contact',
        negotiable: 'Yes',
        conditionLabel: 'Good',
        delivery: 'Meetup',
        postToMarketplace: true,
        imageUrls: [],
        videoUrls: []
      }
    });

    return response.status(201).json({
      post: mapItemToPost(item)
    });
  } catch (error) {
    console.error('[POST_CREATE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to create post.' });
  }
});

postRoutes.delete('/:id', async (request, response) => {
  try {
    const postId = parsePositiveInteger(request.params?.id);

    if (!postId) {
      return response.status(400).json({ error: 'Invalid post id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await deleteItem({
      itemId: postId,
      userGoogleId: user.googleId
    });

    if (!result.deleted && result.reason === 'not_found') {
      return response.status(404).json({ error: 'Post not found.' });
    }

    if (!result.deleted && result.reason === 'forbidden') {
      return response.status(403).json({ error: 'You can only delete your own posts.' });
    }

    return response.json({ ok: true });
  } catch (error) {
    console.error('[POST_DELETE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to delete post.' });
  }
});

export default postRoutes;
