import { Router } from 'express';
import { requireAuthenticatedUser } from '../services/authService.js';
import { acceptOffer, createOffer, listOffersForBuyer, listOffersForSeller } from '../services/offerService.js';

const offerRoutes = Router();

function parseOfferId(value) {
  const parsed = Number.parseInt(String(value || ''), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

offerRoutes.post('/', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await createOffer({
      itemId: request.body?.itemId,
      buyerGoogleId: user.googleId,
      offeredPrice: request.body?.offeredPrice,
      message: request.body?.message
    });

    if (!result.created && result.reason === 'invalid_item_id') {
      return response.status(400).json({ error: 'Invalid item id.' });
    }

    if (!result.created && result.reason === 'invalid_price') {
      return response.status(400).json({ error: 'Offered price must be a positive number.' });
    }

    if (!result.created && result.reason === 'item_not_found') {
      return response.status(404).json({ error: 'Item not found.' });
    }

    if (!result.created && result.reason === 'cannot_offer_own_item') {
      return response.status(403).json({ error: 'You cannot make an offer on your own item.' });
    }

    if (!result.created && result.reason === 'item_not_available') {
      return response.status(409).json({ error: 'Item is already closed and no longer accepting offers.' });
    }

    return response.status(201).json({ offer: result.offer });
  } catch (error) {
    console.error('[OFFER_CREATE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to create offer.' });
  }
});

offerRoutes.get('/seller', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const offers = await listOffersForSeller({
      sellerGoogleId: user.googleId,
      itemId: request.query?.itemId,
      status: request.query?.status,
      limit: request.query?.limit
    });

    return response.json({ offers });
  } catch (error) {
    console.error('[OFFER_LIST_SELLER_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load seller offers.' });
  }
});

offerRoutes.get('/mine', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const offers = await listOffersForBuyer({
      buyerGoogleId: user.googleId,
      itemId: request.query?.itemId,
      status: request.query?.status,
      limit: request.query?.limit
    });

    return response.json({ offers });
  } catch (error) {
    console.error('[OFFER_LIST_BUYER_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load your offers.' });
  }
});

offerRoutes.post('/:id/accept', async (request, response) => {
  try {
    const offerId = parseOfferId(request.params?.id);

    if (!offerId) {
      return response.status(400).json({ error: 'Invalid offer id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await acceptOffer({
      offerId,
      sellerGoogleId: user.googleId
    });

    if (!result.accepted && result.reason === 'offer_not_found') {
      return response.status(404).json({ error: 'Offer not found.' });
    }

    if (!result.accepted && result.reason === 'item_not_found') {
      return response.status(404).json({ error: 'Item not found.' });
    }

    if (!result.accepted && result.reason === 'forbidden') {
      return response.status(403).json({ error: 'You can only accept offers for your own items.' });
    }

    if (!result.accepted && result.reason === 'offer_not_pending') {
      return response.status(409).json({ error: 'This offer is no longer pending.' });
    }

    if (!result.accepted && result.reason === 'item_not_available') {
      return response.status(409).json({ error: 'Item is already closed and cannot accept new offers.' });
    }

    return response.json({
      offer: result.offer,
      item: result.item
    });
  } catch (error) {
    console.error('[OFFER_ACCEPT_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to accept offer.' });
  }
});

export default offerRoutes;
