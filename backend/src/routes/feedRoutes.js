import { Router } from 'express';
import { getFeed } from '../services/feedService.js';

const feedRoutes = Router();

feedRoutes.get('/', async (request, response) => {
  try {
    const payload = await getFeed({
      limit: request.query?.limit,
      before: request.query?.before
    });

    return response.json(payload);
  } catch (error) {
    console.error('[FEED_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load feed.' });
  }
});

export default feedRoutes;
