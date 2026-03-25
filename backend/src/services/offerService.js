import { getDataSource } from '../core/dataSource.js';
import { OfferEntity } from '../entities/OfferEntity.js';
import { ItemEntity } from '../entities/ItemEntity.js';

const OFFER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

const ACTIVE_ITEM_STATUS = 'active';
const HIDDEN_ITEM_STATUS = 'hidden';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInteger(value) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw.replace(/[^\d]/g, ''), 10);

  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeOffer(offer, item = null) {
  return {
    id: offer.id,
    itemId: offer.itemId,
    buyerGoogleId: offer.buyerGoogleId,
    sellerGoogleId: offer.sellerGoogleId,
    offeredPrice: offer.offeredPrice,
    status: offer.status || OFFER_STATUS.PENDING,
    message: offer.message || '',
    expiresAt: offer.expiresAt || null,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    item: item
      ? {
          id: item.id,
          itemName: item.itemName,
          price: item.price,
          sellerGoogleId: item.sellerGoogleId,
          listingStatus: item.listingStatus || ACTIVE_ITEM_STATUS,
          imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : []
        }
      : null
  };
}

function parseLimit(rawLimit) {
  const parsed = Number.parseInt(String(rawLimit || ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 200;
  }
  return Math.min(parsed, 500);
}

export async function createOffer({ itemId, buyerGoogleId, offeredPrice, message }) {
  const normalizedItemId = parsePositiveInteger(itemId);
  const normalizedBuyerGoogleId = normalizeText(buyerGoogleId);
  const normalizedPrice = parsePositiveInteger(offeredPrice);
  const normalizedMessage = normalizeText(message).slice(0, 1000);

  if (!normalizedItemId) {
    return { created: false, reason: 'invalid_item_id', offer: null };
  }

  if (!normalizedBuyerGoogleId) {
    return { created: false, reason: 'unauthenticated', offer: null };
  }

  if (!normalizedPrice) {
    return { created: false, reason: 'invalid_price', offer: null };
  }

  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const offerRepo = dataSource.getRepository(OfferEntity);

  const item = await itemRepo.findOneBy({ id: normalizedItemId });

  if (!item) {
    return { created: false, reason: 'item_not_found', offer: null };
  }

  if (item.sellerGoogleId === normalizedBuyerGoogleId) {
    return { created: false, reason: 'cannot_offer_own_item', offer: null };
  }

  if (item.listingStatus !== ACTIVE_ITEM_STATUS) {
    return { created: false, reason: 'item_not_available', offer: null };
  }

  const created = offerRepo.create({
    itemId: item.id,
    buyerGoogleId: normalizedBuyerGoogleId,
    sellerGoogleId: item.sellerGoogleId,
    offeredPrice: normalizedPrice,
    status: OFFER_STATUS.PENDING,
    message: normalizedMessage || null
  });

  const saved = await offerRepo.save(created);
  return { created: true, reason: '', offer: normalizeOffer(saved, item) };
}

export async function listOffersForSeller({ sellerGoogleId, itemId, status, limit }) {
  const normalizedSellerGoogleId = normalizeText(sellerGoogleId);
  const normalizedItemId = parsePositiveInteger(itemId);
  const normalizedStatus = normalizeText(status).toLowerCase();
  const normalizedLimit = parseLimit(limit);

  if (!normalizedSellerGoogleId) {
    return [];
  }

  const dataSource = await getDataSource();
  const offerRepo = dataSource.getRepository(OfferEntity);
  const itemRepo = dataSource.getRepository(ItemEntity);

  const query = offerRepo
    .createQueryBuilder('offer')
    .where('offer.sellerGoogleId = :sellerGoogleId', {
      sellerGoogleId: normalizedSellerGoogleId
    })
    .orderBy(`CASE WHEN offer.status = '${OFFER_STATUS.PENDING}' THEN 0 ELSE 1 END`, 'ASC')
    .addOrderBy('offer.createdAt', 'DESC')
    .take(normalizedLimit);

  if (normalizedItemId) {
    query.andWhere('offer.itemId = :itemId', { itemId: normalizedItemId });
  }

  if (
    normalizedStatus &&
    Object.values(OFFER_STATUS).includes(normalizedStatus)
  ) {
    query.andWhere('offer.status = :status', { status: normalizedStatus });
  }

  const offers = await query.getMany();

  if (!offers.length) {
    return [];
  }

  const itemIds = Array.from(new Set(offers.map((offer) => offer.itemId)));
  const items = await itemRepo
    .createQueryBuilder('item')
    .where('item.id IN (:...itemIds)', { itemIds })
    .getMany();
  const itemMap = new Map(items.map((item) => [item.id, item]));

  return offers.map((offer) => normalizeOffer(offer, itemMap.get(offer.itemId) || null));
}

export async function listOffersForBuyer({ buyerGoogleId, itemId, status, limit }) {
  const normalizedBuyerGoogleId = normalizeText(buyerGoogleId);
  const normalizedItemId = parsePositiveInteger(itemId);
  const normalizedStatus = normalizeText(status).toLowerCase();
  const normalizedLimit = parseLimit(limit);

  if (!normalizedBuyerGoogleId) {
    return [];
  }

  const dataSource = await getDataSource();
  const offerRepo = dataSource.getRepository(OfferEntity);
  const itemRepo = dataSource.getRepository(ItemEntity);

  const query = offerRepo
    .createQueryBuilder('offer')
    .where('offer.buyerGoogleId = :buyerGoogleId', {
      buyerGoogleId: normalizedBuyerGoogleId
    })
    .orderBy('offer.createdAt', 'DESC')
    .take(normalizedLimit);

  if (normalizedItemId) {
    query.andWhere('offer.itemId = :itemId', { itemId: normalizedItemId });
  }

  if (normalizedStatus && Object.values(OFFER_STATUS).includes(normalizedStatus)) {
    query.andWhere('offer.status = :status', { status: normalizedStatus });
  }

  const offers = await query.getMany();

  if (!offers.length) {
    return [];
  }

  const itemIds = Array.from(new Set(offers.map((offer) => offer.itemId)));
  const items = await itemRepo
    .createQueryBuilder('item')
    .where('item.id IN (:...itemIds)', { itemIds })
    .getMany();
  const itemMap = new Map(items.map((item) => [item.id, item]));

  return offers.map((offer) => normalizeOffer(offer, itemMap.get(offer.itemId) || null));
}

export async function acceptOffer({ offerId, sellerGoogleId }) {
  const normalizedOfferId = parsePositiveInteger(offerId);
  const normalizedSellerGoogleId = normalizeText(sellerGoogleId);

  if (!normalizedOfferId) {
    return { accepted: false, reason: 'invalid_offer_id', offer: null, item: null };
  }

  if (!normalizedSellerGoogleId) {
    return { accepted: false, reason: 'unauthenticated', offer: null, item: null };
  }

  const dataSource = await getDataSource();

  return dataSource.transaction(async (manager) => {
    const offerRepo = manager.getRepository(OfferEntity);
    const itemRepo = manager.getRepository(ItemEntity);

    const offer = await offerRepo.findOneBy({ id: normalizedOfferId });

    if (!offer) {
      return { accepted: false, reason: 'offer_not_found', offer: null, item: null };
    }

    if (offer.sellerGoogleId !== normalizedSellerGoogleId) {
      return { accepted: false, reason: 'forbidden', offer: null, item: null };
    }

    if (offer.status !== OFFER_STATUS.PENDING) {
      return { accepted: false, reason: 'offer_not_pending', offer: null, item: null };
    }

    const item = await itemRepo.findOneBy({ id: offer.itemId });

    if (!item) {
      return { accepted: false, reason: 'item_not_found', offer: null, item: null };
    }

    if (item.sellerGoogleId !== normalizedSellerGoogleId) {
      return { accepted: false, reason: 'forbidden', offer: null, item: null };
    }

    if (item.listingStatus !== ACTIVE_ITEM_STATUS) {
      return { accepted: false, reason: 'item_not_available', offer: null, item: null };
    }

    offer.status = OFFER_STATUS.ACCEPTED;
    const acceptedOffer = await offerRepo.save(offer);

    await offerRepo
      .createQueryBuilder()
      .update()
      .set({ status: OFFER_STATUS.REJECTED })
      .where('item_id = :itemId', { itemId: offer.itemId })
      .andWhere('id != :offerId', { offerId: offer.id })
      .andWhere('status = :pendingStatus', { pendingStatus: OFFER_STATUS.PENDING })
      .execute();

    item.listingStatus = HIDDEN_ITEM_STATUS;
    item.soldToGoogleId = acceptedOffer.buyerGoogleId;
    item.soldAt = new Date();
    item.reservedByGoogleId = null;
    item.reservedAt = null;
    const savedItem = await itemRepo.save(item);

    return {
      accepted: true,
      reason: '',
      offer: normalizeOffer(acceptedOffer, savedItem),
      item: savedItem
    };
  });
}
