import { Router } from 'express';
import { requireAuthenticatedUser } from '../services/authService.js';
import {
  markItemSold,
  createItem,
  deleteItem,
  getItemFilterOptions,
  getItemById,
  getItems,
  getSimilarItems,
  listFavoriteItemsForUser,
  reserveItem,
  sanitizeItemInput,
  setItemFavorite,
  unreserveItem,
  updateItemListingStatus,
  updateItem
} from '../services/itemService.js';

const itemRoutes = Router();

function parseItemId(value) {
  const parsed = Number.parseInt(value || '', 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseBooleanQuery(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value || ''), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseFiniteNumber(value) {
  const parsed = Number.parseFloat(String(value || '').trim());

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function isItemValidationError(error) {
  const message = String(error?.message || '');
  return (
    message.includes('Invalid wardCode') ||
    message.includes('Duration must be greater than 0 hour') ||
    message.includes('Invalid listing status') ||
    message.includes('Condition is invalid') ||
    message.includes('Delivery is invalid') ||
    message.includes('Negotiable is invalid')
  );
}

function getForeignKeyViolationMessage(error) {
  const code = String(error?.code || '');

  if (code !== '23503') {
    return '';
  }

  const constraint = String(error?.constraint || '');

  if (constraint.toLowerCase().includes('ward')) {
    return 'Invalid wardCode. Please select an existing ward.';
  }

  if (constraint.toLowerCase().includes('seller') || constraint.toLowerCase().includes('user')) {
    return 'Seller account is invalid or no longer exists. Please login again.';
  }

  return 'Foreign key validation failed. Please verify related item/user/location data.';
}

itemRoutes.post('/', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const { payload, error } = sanitizeItemInput(request.body || {});

    if (error) {
      return response.status(400).json({ error });
    }

    const item = await createItem({
      user,
      payload
    });

    return response.status(201).json({ item });
  } catch (error) {
    console.error('[ITEM_CREATE_ERROR]', error.message);
    const fkError = getForeignKeyViolationMessage(error);
    if (fkError) {
      return response.status(400).json({ error: fkError });
    }
    if (isItemValidationError(error)) {
      return response.status(400).json({ error: error.message });
    }
    return response.status(500).json({ error: 'Failed to create item post.' });
  }
});

itemRoutes.get('/', async (request, response) => {
  try {
    let sellerGoogleId = request.query?.sellerGoogleId || '';
    const requestMineOnly = parseBooleanQuery(request.query?.mine);

    if (requestMineOnly) {
      const { user } = await requireAuthenticatedUser(request);

      if (!user) {
        return response.status(401).json({ error: 'Authentication required.' });
      }

      sellerGoogleId = user.googleId;
    }

    const payload = await getItems({
      limit: request.query?.limit,
      keyword: request.query?.keyword,
      sellerGoogleId,
      nearWardCode: parsePositiveInteger(request.query?.nearWardCode),
      nearLatitude: parseFiniteNumber(request.query?.nearLatitude),
      nearLongitude: parseFiniteNumber(request.query?.nearLongitude)
    });

    return response.json(payload);
  } catch (error) {
    console.error('[ITEMS_LIST_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load items.' });
  }
});

itemRoutes.get('/filter-options', async (_request, response) => {
  try {
    const payload = await getItemFilterOptions();
    return response.json(payload);
  } catch (error) {
    console.error('[ITEM_FILTER_OPTIONS_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load item filter options.' });
  }
});

itemRoutes.get('/favorites/mine', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const items = await listFavoriteItemsForUser({
      userGoogleId: user.googleId,
      limit: request.query?.limit
    });

    return response.json({ items });
  } catch (error) {
    console.error('[ITEM_FAVORITES_MINE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load favorite items.' });
  }
});

itemRoutes.get('/:id', async (request, response) => {
  try {
    const itemId = parseItemId(request.params?.id);

    if (!itemId) {
      return response.status(400).json({ error: 'Invalid item id.' });
    }

    const item = await getItemById(itemId);

    if (!item) {
      return response.status(404).json({ error: 'Item not found.' });
    }

    return response.json({ item });
  } catch (error) {
    console.error('[ITEM_DETAIL_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load item detail.' });
  }
});

itemRoutes.get('/:id/similar', async (request, response) => {
  try {
    const itemId = parseItemId(request.params?.id);

    if (!itemId) {
      return response.status(400).json({ error: 'Invalid item id.' });
    }

    const items = await getSimilarItems({
      itemId,
      limit: request.query?.limit
    });

    return response.json({ items });
  } catch (error) {
    console.error('[ITEM_SIMILAR_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load similar items.' });
  }
});

itemRoutes.put('/:id', async (request, response) => {
  try {
    const itemId = parseItemId(request.params?.id);

    if (!itemId) {
      return response.status(400).json({ error: 'Invalid item id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const { payload, error } = sanitizeItemInput(request.body || {});

    if (error) {
      return response.status(400).json({ error });
    }

    const result = await updateItem({
      itemId,
      userGoogleId: user.googleId,
      payload
    });

    if (!result.updated && result.reason === 'not_found') {
      return response.status(404).json({ error: 'Item not found.' });
    }

    if (!result.updated && result.reason === 'forbidden') {
      return response.status(403).json({ error: 'You can only edit your own items.' });
    }

    return response.json({ item: result.item });
  } catch (error) {
    console.error('[ITEM_UPDATE_ERROR]', error.message);
    const fkError = getForeignKeyViolationMessage(error);
    if (fkError) {
      return response.status(400).json({ error: fkError });
    }
    if (isItemValidationError(error)) {
      return response.status(400).json({ error: error.message });
    }
    return response.status(500).json({ error: 'Failed to update item post.' });
  }
});

itemRoutes.put('/:id/favorite', async (request, response) => {
  try {
    const itemId = parseItemId(request.params?.id);

    if (!itemId) {
      return response.status(400).json({ error: 'Invalid item id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const favorite = parseBooleanQuery(request.body?.favorite ?? true);
    const result = await setItemFavorite({
      itemId,
      userGoogleId: user.googleId,
      favorite
    });

    if (!result.ok && result.reason === 'not_found') {
      return response.status(404).json({ error: 'Item not found.' });
    }

    return response.json({ ok: true, isFavorited: result.isFavorited });
  } catch (error) {
    console.error('[ITEM_FAVORITE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to update favorite item.' });
  }
});

itemRoutes.patch('/:id/status', async (request, response) => {
  try {
    const itemId = parseItemId(request.params?.id);

    if (!itemId) {
      return response.status(400).json({ error: 'Invalid item id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await updateItemListingStatus({
      itemId,
      userGoogleId: user.googleId,
      status: request.body?.status
    });

    if (!result.updated && result.reason === 'not_found') {
      return response.status(404).json({ error: 'Item not found.' });
    }

    if (!result.updated && result.reason === 'forbidden') {
      return response.status(403).json({ error: 'You can only update your own items.' });
    }

    return response.json({ item: result.item });
  } catch (error) {
    console.error('[ITEM_STATUS_UPDATE_ERROR]', error.message);
    if (isItemValidationError(error)) {
      return response.status(400).json({ error: error.message });
    }
    return response.status(500).json({ error: 'Failed to update item status.' });
  }
});

itemRoutes.post('/:id/reserve', async (request, response) => {
  try {
    const itemId = parseItemId(request.params?.id);

    if (!itemId) {
      return response.status(400).json({ error: 'Invalid item id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await reserveItem({
      itemId,
      userGoogleId: user.googleId
    });

    if (!result.updated && result.reason === 'not_found') {
      return response.status(404).json({ error: 'Item not found.' });
    }

    if (!result.updated && result.reason === 'cannot_reserve_own_item') {
      return response.status(403).json({ error: 'You cannot reserve your own item.' });
    }

    if (!result.updated && result.reason === 'not_available') {
      return response.status(409).json({ error: 'Item is no longer available.' });
    }

    return response.json({ item: result.item });
  } catch (error) {
    console.error('[ITEM_RESERVE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to reserve item.' });
  }
});

itemRoutes.post('/:id/unreserve', async (request, response) => {
  try {
    const itemId = parseItemId(request.params?.id);

    if (!itemId) {
      return response.status(400).json({ error: 'Invalid item id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await unreserveItem({
      itemId,
      userGoogleId: user.googleId
    });

    if (!result.updated && result.reason === 'not_found') {
      return response.status(404).json({ error: 'Item not found.' });
    }

    if (!result.updated && result.reason === 'forbidden') {
      return response.status(403).json({ error: 'You cannot unreserve this item.' });
    }

    return response.json({ item: result.item });
  } catch (error) {
    console.error('[ITEM_UNRESERVE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to unreserve item.' });
  }
});

itemRoutes.post('/:id/sold', async (request, response) => {
  try {
    const itemId = parseItemId(request.params?.id);

    if (!itemId) {
      return response.status(400).json({ error: 'Invalid item id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await markItemSold({
      itemId,
      sellerGoogleId: user.googleId,
      buyerGoogleId: request.body?.buyerGoogleId
    });

    if (!result.updated && result.reason === 'not_found') {
      return response.status(404).json({ error: 'Item not found.' });
    }

    if (!result.updated && result.reason === 'forbidden') {
      return response.status(403).json({ error: 'You can only mark your own item as sold.' });
    }

    return response.json({ item: result.item });
  } catch (error) {
    console.error('[ITEM_MARK_SOLD_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to mark item as sold.' });
  }
});

itemRoutes.delete('/:id', async (request, response) => {
  try {
    const itemId = parseItemId(request.params?.id);

    if (!itemId) {
      return response.status(400).json({ error: 'Invalid item id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await deleteItem({ itemId, userGoogleId: user.googleId });

    if (!result.deleted && result.reason === 'not_found') {
      return response.status(404).json({ error: 'Item not found.' });
    }

    if (!result.deleted && result.reason === 'forbidden') {
      return response.status(403).json({ error: 'You can only delete your own items.' });
    }

    return response.json({ ok: true });
  } catch (error) {
    console.error('[ITEM_DELETE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to delete item post.' });
  }
});

export default itemRoutes;
