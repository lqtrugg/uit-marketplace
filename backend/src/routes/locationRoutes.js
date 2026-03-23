import { Router } from 'express';
import { listHcmWards } from '../services/hcmLocationService.js';

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

export default locationRoutes;
