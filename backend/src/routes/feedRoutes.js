import { Router } from 'express';
import { getItems } from '../services/itemService.js';

const feedRoutes = Router();

feedRoutes.get('/', async (request, response) => {
  try {
    const payload = await getItems({
      limit: request.query?.limit,
      keyword: request.query?.keyword
    });

    return response.json(payload);
  } catch (error) {
    console.error('[FEED_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load feed.' });
  }
});

export default feedRoutes;
