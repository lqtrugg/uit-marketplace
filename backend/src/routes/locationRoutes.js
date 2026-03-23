import { Router } from 'express';
import { crawlAndSyncHcmWards, listHcmWards } from '../services/hcmLocationService.js';

const locationRoutes = Router();

locationRoutes.get('/hcm/wards', async (request, response) => {
  try {
    const payload = await listHcmWards({
      districtCode: request.query?.districtCode,
      keyword: request.query?.keyword,
      limit: request.query?.limit
    });

    return response.json(payload);
  } catch (error) {
    console.error('[HCM_WARDS_LIST_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load Ho Chi Minh wards.' });
  }
});

locationRoutes.post('/hcm/wards/sync', async (_request, response) => {
  try {
    const payload = await crawlAndSyncHcmWards();
    return response.json(payload);
  } catch (error) {
    console.error('[HCM_WARDS_SYNC_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to sync Ho Chi Minh wards.' });
  }
});

export default locationRoutes;
