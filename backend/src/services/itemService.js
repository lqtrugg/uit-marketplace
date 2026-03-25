import { getDataSource } from '../core/dataSource.js';
import { ItemEntity } from '../entities/ItemEntity.js';
import { HcmWardEntity } from '../entities/HcmWardEntity.js';
import { ItemFavoriteEntity } from '../entities/ItemFavoriteEntity.js';

const MAX_IMAGE_URLS = 12;
const MIN_TOTAL_ITEMS = 8;
const HCM_DEFAULT_ZIP_CODE = '700000';
const MAX_DURATION_DAYS = 365;
const MAX_DURATION_HOURS = 23;
const MAX_NEARBY_QUERY_LIMIT = 300;
const LISTING_STATUS = {
  ACTIVE: 'active',
  RESERVED: 'reserved',
  SOLD: 'sold',
  HIDDEN: 'hidden'
};
const LISTING_STATUS_VALUES = Object.values(LISTING_STATUS);
const DUMMY_SELLER = {
  googleId: 'seed-system',
  name: 'UIT Marketplace Seed',
  email: 'seed@gm.uit.edu.vn'
};
const DUMMY_ITEM_TEMPLATES = [
  {
    itemName: 'Bose Sport Earbuds - Wireless Earphones',
    price: '$2,300',
    description: 'Used item from lab setup, fully working, battery still strong.',
    reasonForSelling: 'No longer needed for current semester project.',
    imageUrls: ['/clicon/image/product/product-1.png']
  },
  {
    itemName: 'Simple Mobile 4G LTE Prepaid Smartphone',
    price: '$220',
    description: 'Good condition smartphone, all functions tested.',
    reasonForSelling: 'Upgraded to a newer device.',
    imageUrls: ['/clicon/image/product/product-2.png']
  },
  {
    itemName: '4K UHD LED Smart TV with Chromecast Built-in',
    price: '$1,50',
    description: 'Display panel in good condition, comes with remote.',
    reasonForSelling: 'Moving to a smaller room.',
    imageUrls: ['/clicon/image/product/product-3.png']
  },
  {
    itemName: 'Sony DSCHX8 High Zoom Point & Shoot Camera',
    price: '$1,200',
    description: 'Camera body and lens are clean, suitable for beginner photography.',
    reasonForSelling: 'Switched to another camera system.',
    imageUrls: ['/clicon/image/product/product-4.png']
  },
  {
    itemName: 'Dell Optiplex 7000x7480 All-in-One Monitor',
    price: '$70',
    description: 'Used monitor in stable condition, no dead pixel noticed.',
    reasonForSelling: 'Need to free desk space.',
    imageUrls: ['/clicon/image/product/product-6.png']
  },
  {
    itemName: 'Portable Washing Machine 11lbs Model 18NMFIAM',
    price: '$1,50',
    description: 'Running normally, suitable for shared apartment.',
    reasonForSelling: 'Relocating soon.',
    imageUrls: ['/clicon/image/product/product-7.png']
  },
  {
    itemName: 'TOZO T6 True Wireless Earbuds',
    price: '$36',
    description: 'Compact earbuds, clear audio, charging case included.',
    reasonForSelling: 'Not using this pair anymore.',
    imageUrls: ['/clicon/image/product/product-23.png']
  },
  {
    itemName: 'Wired Over-Ear Gaming Headphones with USB',
    price: '$299',
    description: 'Headset mic and audio are working, cable is intact.',
    reasonForSelling: 'Upgraded to wireless headset.',
    imageUrls: ['/clicon/image/product/product-19.png']
  }
];

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePriceNumber(value) {
  const digits = String(value || '')
    .replace(/[^\d]/g, '')
    .trim();

  if (!digits) {
    return 0;
  }

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeItem(item) {
  const durationDays = Number.isInteger(item.durationDays) ? item.durationDays : 0;
  const durationHours = Number.isInteger(item.durationHours) ? item.durationHours : 0;

  return {
    id: item.id,
    sellerGoogleId: item.sellerGoogleId,
    sellerName: item.sellerName,
    sellerEmail: item.sellerEmail,
    itemName: item.itemName,
    description: item.description,
    availabilityDuration: `${durationDays} day(s) ${durationHours} hour(s)`,
    durationDays,
    durationHours,
    location: item.location,
    wardCode: item.wardCode || null,
    reasonForSelling: item.reasonForSelling,
    price: item.price,
    zipCode: item.zipCode || HCM_DEFAULT_ZIP_CODE,
    negotiable: item.negotiable,
    conditionLabel: item.conditionLabel,
    delivery: item.delivery || '',
    listingStatus: item.listingStatus || LISTING_STATUS.ACTIVE,
    reservedByGoogleId: item.reservedByGoogleId || null,
    reservedAt: item.reservedAt || null,
    soldToGoogleId: item.soldToGoogleId || null,
    soldAt: item.soldAt || null,
    postToMarketplace: Boolean(item.postToMarketplace),
    imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : [],
    videoUrls: Array.isArray(item.videoUrls) ? item.videoUrls : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function requireText(label, value, maxLength) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return {
      value: '',
      error: `${label} is required.`
    };
  }

  if (normalized.length > maxLength) {
    return {
      value: '',
      error: `${label} must be ${maxLength} characters or fewer.`
    };
  }

  return {
    value: normalized,
    error: ''
  };
}

function normalizeDurationValue(label, value, maxValue) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return {
      value: 0,
      error: `${label} is required.`
    };
  }

  if (!/^\d+$/.test(raw)) {
    return {
      value: 0,
      error: `${label} must be a non-negative integer.`
    };
  }

  const parsed = Number.parseInt(raw, 10);

  if (parsed < 0 || parsed > maxValue) {
    return {
      value: 0,
      error: `${label} must be between 0 and ${maxValue}.`
    };
  }

  return {
    value: parsed,
    error: ''
  };
}

function normalizeImageUrls(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return {
      value: [],
      error: ''
    };
  }

  if (!Array.isArray(rawValue)) {
    return {
      value: [],
      error: 'Image URLs must be an array.'
    };
  }

  const values = rawValue
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  if (values.length > MAX_IMAGE_URLS) {
    return {
      value: [],
      error: `Image URLs must have at most ${MAX_IMAGE_URLS} entries.`
    };
  }

  for (const item of values) {
    if (!/^https?:\/\//i.test(item) && !item.startsWith('/')) {
      return {
        value: [],
        error: 'Each image URL must start with http://, https:// or /.'
      };
    }
  }

  return {
    value: values,
    error: ''
  };
}

function normalizeVideoUrls(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return {
      value: [],
      error: ''
    };
  }

  if (!Array.isArray(rawValue)) {
    return {
      value: [],
      error: 'Video URLs must be an array.'
    };
  }

  const values = rawValue
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  if (values.length > MAX_IMAGE_URLS) {
    return {
      value: [],
      error: `Video URLs must have at most ${MAX_IMAGE_URLS} entries.`
    };
  }

  for (const item of values) {
    if (!/^https?:\/\//i.test(item) && !item.startsWith('/')) {
      return {
        value: [],
        error: 'Each video URL must start with http://, https:// or /.'
      };
    }
  }

  return {
    value: values,
    error: ''
  };
}

function normalizeNegotiableInput(rawValue) {
  const normalized = normalizeText(rawValue).toLowerCase();

  if (!normalized) {
    return {
      value: 'Yes',
      error: ''
    };
  }

  if (['yes', 'y', 'true', '1'].includes(normalized)) {
    return {
      value: 'Yes',
      error: ''
    };
  }

  if (['no', 'n', 'false', '0'].includes(normalized)) {
    return {
      value: 'No',
      error: ''
    };
  }

  return {
    value: 'Yes',
    error: 'Negotiable is invalid.'
  };
}

function normalizeConditionInput(rawValue) {
  const normalized = normalizeText(rawValue).toLowerCase();

  if (!normalized) {
    return {
      value: 'Good',
      error: ''
    };
  }

  const map = {
    'like new': 'Like New',
    likenew: 'Like New',
    new: 'Like New',
    excellent: 'Like New',
    good: 'Good',
    used: 'Good',
    fair: 'Fair',
    poor: 'Poor'
  };

  const matched = map[normalized];

  if (!matched) {
    return {
      value: 'Good',
      error: 'Condition is invalid.'
    };
  }

  return {
    value: matched,
    error: ''
  };
}

function normalizeDeliveryInput(rawValue) {
  const normalized = normalizeText(rawValue).toLowerCase();

  if (!normalized) {
    return {
      value: 'Meetup',
      error: ''
    };
  }

  const map = {
    meetup: 'Meetup',
    meet: 'Meetup',
    pickup: 'Meetup',
    'shipping cod': 'Shipping COD',
    shipping: 'Shipping COD',
    cod: 'Shipping COD'
  };

  const matched = map[normalized];

  if (!matched) {
    return {
      value: 'Meetup',
      error: 'Delivery is invalid.'
    };
  }

  return {
    value: matched,
    error: ''
  };
}

function parseLimit(rawLimit) {
  const parsed = Number.parseInt(rawLimit || '20', 10);

  if (Number.isNaN(parsed)) {
    return 20;
  }

  return Math.min(Math.max(parsed, 1), 100);
}

function toFiniteCoordinate(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function normalizeGeoCodingText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeWardCentroid(ward) {
  const q = `${ward.wardDivisionType || 'phường'} ${ward.wardName}, Thành phố Hồ Chí Minh, Việt Nam`;
  const searchParams = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '1'
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'uit-marketplace/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Geocoding HTTP ${response.status}`);
  }

  const payload = await response.json();
  const first = Array.isArray(payload) ? payload[0] : null;

  if (!first) {
    return null;
  }

  const latitude = Number.parseFloat(first.lat);
  const longitude = Number.parseFloat(first.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const displayName = normalizeGeoCodingText(first.display_name || '');

  if (!displayName.includes('ho chi minh')) {
    return null;
  }

  return {
    latitude,
    longitude
  };
}

async function ensureWardCoordinates(wardRepo, wardCodes) {
  if (!Array.isArray(wardCodes) || wardCodes.length === 0) {
    return new Map();
  }

  const wards = await wardRepo
    .createQueryBuilder('ward')
    .where('ward.ward_code IN (:...wardCodes)', { wardCodes })
    .getMany();

  const missing = wards.filter(
    (ward) => !Number.isFinite(ward.latitude) || !Number.isFinite(ward.longitude)
  );

  for (const ward of missing) {
    try {
      const result = await geocodeWardCentroid(ward);

      if (result) {
        ward.latitude = result.latitude;
        ward.longitude = result.longitude;
        await wardRepo.save(ward);
      }
    } catch {
      // no-op
    }

    await sleep(120);
  }

  const refreshed = await wardRepo
    .createQueryBuilder('ward')
    .where('ward.ward_code IN (:...wardCodes)', { wardCodes })
    .getMany();

  return new Map(
    refreshed.map((ward) => [
      ward.wardCode,
      {
        latitude: Number.isFinite(ward.latitude) ? ward.latitude : null,
        longitude: Number.isFinite(ward.longitude) ? ward.longitude : null
      }
    ])
  );
}

function buildDummyItemEntity(template, index) {
  const defaultLocation = 'Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh';

  return {
    sellerGoogleId: DUMMY_SELLER.googleId,
    sellerName: DUMMY_SELLER.name,
    sellerEmail: DUMMY_SELLER.email,
    itemName: template.itemName,
    description: template.description,
    availabilityDuration: `${7 + index} day(s) 0 hour(s)`,
    durationDays: 7 + index,
    durationHours: 0,
    location: defaultLocation,
    wardCode: 790001,
    reasonForSelling: template.reasonForSelling,
    price: template.price,
    zipCode: HCM_DEFAULT_ZIP_CODE,
    negotiable: 'Yes',
    conditionLabel: 'Good',
    delivery: 'Meetup',
    listingStatus: LISTING_STATUS.ACTIVE,
    postToMarketplace: true,
    imageUrls: template.imageUrls,
    videoUrls: []
  };
}

async function ensureMinimumDummyItems(itemRepo) {
  const count = await itemRepo.count();

  if (count >= MIN_TOTAL_ITEMS) {
    return;
  }

  const existingRows = await itemRepo.find({
    select: {
      itemName: true
    }
  });

  const existingNames = new Set(
    existingRows
      .map((row) => normalizeText(row.itemName).toLowerCase())
      .filter(Boolean)
  );

  const itemsToCreate = DUMMY_ITEM_TEMPLATES
    .filter((template) => !existingNames.has(normalizeText(template.itemName).toLowerCase()))
    .slice(0, Math.max(MIN_TOTAL_ITEMS - count, 0))
    .map((template, index) => itemRepo.create(buildDummyItemEntity(template, index)));

  if (itemsToCreate.length) {
    await itemRepo.save(itemsToCreate);
  }
}

function assertItemStatus(value) {
  const normalized = normalizeText(value).toLowerCase();

  if (!LISTING_STATUS_VALUES.includes(normalized)) {
    throw new Error(`Invalid listing status. Allowed: ${LISTING_STATUS_VALUES.join(', ')}.`);
  }

  return normalized;
}

export function sanitizeItemInput(input) {
  const rawReason = input?.reason !== undefined ? input.reason : input?.reasonForSelling;
  const rawCondition = input?.condition !== undefined ? input.condition : input?.conditionLabel;
  const rawDelivery = input?.delivery !== undefined ? input.delivery : input?.selfPickup;
  const itemName = requireText('Item name', input?.itemName, 180);
  const description = requireText('Item description', input?.description, 5000);
  const durationDays = normalizeDurationValue('Duration days', input?.durationDays, MAX_DURATION_DAYS);
  const durationHours = normalizeDurationValue('Duration hours', input?.durationHours, MAX_DURATION_HOURS);
  const wardCode = normalizeDurationValue('Ward code', input?.wardCode, 99999999);
  const reasonForSelling = requireText('Reason for selling', rawReason, 5000);
  const price = requireText('Price', input?.price, 80);
  const negotiable = normalizeNegotiableInput(input?.negotiable);
  const conditionLabel = normalizeConditionInput(rawCondition);
  const delivery = normalizeDeliveryInput(rawDelivery);
  const imageUrls = normalizeImageUrls(input?.imageUrls);
  const videoUrls = normalizeVideoUrls(input?.videoUrls);

  const checks = [
    itemName,
    description,
    durationDays,
    durationHours,
    wardCode,
    reasonForSelling,
    price,
    negotiable,
    conditionLabel,
    delivery,
    imageUrls,
    videoUrls
  ];

  const firstError = checks.find((item) => item.error);

  if (firstError) {
    return {
      payload: null,
      error: firstError.error
    };
  }

  if (durationDays.value <= 0 && durationHours.value <= 0) {
    return {
      payload: null,
      error: 'Duration must be greater than 0 hour.'
    };
  }

  return {
    payload: {
      itemName: itemName.value,
      description: description.value,
      durationDays: durationDays.value,
      durationHours: durationHours.value,
      wardCode: wardCode.value,
      reasonForSelling: reasonForSelling.value,
      price: price.value,
      negotiable: negotiable.value,
      conditionLabel: conditionLabel.value,
      delivery: delivery.value,
      postToMarketplace: true,
      imageUrls: imageUrls.value,
      videoUrls: videoUrls.value
    },
    error: ''
  };
}

export async function seedDummyItemsIfNeeded() {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  await ensureMinimumDummyItems(itemRepo);
}

export async function createItem({ user, payload }) {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const wardRepo = dataSource.getRepository(HcmWardEntity);
  const ward = await wardRepo.findOneBy({ wardCode: payload.wardCode });

  if (!ward) {
    throw new Error('Invalid wardCode. Please select a ward in Ho Chi Minh City.');
  }

  if (payload.durationDays <= 0 && payload.durationHours <= 0) {
    throw new Error('Duration must be greater than 0 hour.');
  }

  const location = `${ward.wardName}, ${ward.districtName}, ${ward.provinceName}`;
  const availabilityDuration = `${payload.durationDays} day(s) ${payload.durationHours} hour(s)`;

  const created = itemRepo.create({
    sellerGoogleId: user.googleId,
    sellerName: user.name,
    sellerEmail: user.email,
    itemName: payload.itemName,
    description: payload.description,
    availabilityDuration,
    durationDays: payload.durationDays,
    durationHours: payload.durationHours,
    location,
    wardCode: payload.wardCode,
    reasonForSelling: payload.reasonForSelling,
    price: payload.price,
    zipCode: HCM_DEFAULT_ZIP_CODE,
    negotiable: payload.negotiable,
    conditionLabel: payload.conditionLabel,
    delivery: payload.delivery,
    listingStatus: LISTING_STATUS.ACTIVE,
    postToMarketplace: true,
    imageUrls: payload.imageUrls,
    videoUrls: payload.videoUrls
  });

  const saved = await itemRepo.save(created);
  return normalizeItem(saved);
}

async function applyPayloadToItemEntity(item, payload, wardRepo) {
  const ward = await wardRepo.findOneBy({ wardCode: payload.wardCode });

  if (!ward) {
    throw new Error('Invalid wardCode. Please select a ward in Ho Chi Minh City.');
  }

  if (payload.durationDays <= 0 && payload.durationHours <= 0) {
    throw new Error('Duration must be greater than 0 hour.');
  }

  const location = `${ward.wardName}, ${ward.districtName}, ${ward.provinceName}`;
  const availabilityDuration = `${payload.durationDays} day(s) ${payload.durationHours} hour(s)`;

  item.itemName = payload.itemName;
  item.description = payload.description;
  item.availabilityDuration = availabilityDuration;
  item.durationDays = payload.durationDays;
  item.durationHours = payload.durationHours;
  item.location = location;
  item.wardCode = payload.wardCode;
  item.reasonForSelling = payload.reasonForSelling;
  item.price = payload.price;
  item.zipCode = HCM_DEFAULT_ZIP_CODE;
  item.negotiable = payload.negotiable;
  item.conditionLabel = payload.conditionLabel;
  item.delivery = payload.delivery;
  item.postToMarketplace = true;
  item.imageUrls = payload.imageUrls;
  item.videoUrls = payload.videoUrls;
}

export async function updateItem({ itemId, userGoogleId, payload }) {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const wardRepo = dataSource.getRepository(HcmWardEntity);
  const existing = await itemRepo.findOneBy({ id: itemId });

  if (!existing) {
    return {
      updated: false,
      reason: 'not_found',
      item: null
    };
  }

  if (existing.sellerGoogleId !== userGoogleId) {
    return {
      updated: false,
      reason: 'forbidden',
      item: null
    };
  }

  await applyPayloadToItemEntity(existing, payload, wardRepo);
  const saved = await itemRepo.save(existing);

  return {
    updated: true,
    reason: '',
    item: normalizeItem(saved)
  };
}

export async function deleteItem({ itemId, userGoogleId }) {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const existing = await itemRepo.findOneBy({ id: itemId });

  if (!existing) {
    return {
      deleted: false,
      reason: 'not_found'
    };
  }

  if (existing.sellerGoogleId !== userGoogleId) {
    return {
      deleted: false,
      reason: 'forbidden'
    };
  }

  await itemRepo.delete({ id: itemId });

  return {
    deleted: true,
    reason: ''
  };
}

export async function getItemById(itemId) {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const item = await itemRepo.findOneBy({ id: itemId });

  return item ? normalizeItem(item) : null;
}

export async function getItems({
  limit,
  keyword,
  sellerGoogleId,
  nearWardCode,
  nearLatitude,
  nearLongitude
}) {
  const normalizedLimit = parseLimit(limit);
  const normalizedKeyword = normalizeText(keyword);
  const normalizedSellerGoogleId = normalizeText(sellerGoogleId);
  const normalizedNearWardCode = Number.isInteger(nearWardCode) && nearWardCode > 0 ? nearWardCode : null;
  const normalizedNearLatitude = toFiniteCoordinate(nearLatitude);
  const normalizedNearLongitude = toFiniteCoordinate(nearLongitude);
  const hasGeoCoordinates =
    normalizedNearLatitude !== null &&
    normalizedNearLongitude !== null &&
    normalizedNearLatitude >= -90 &&
    normalizedNearLatitude <= 90 &&
    normalizedNearLongitude >= -180 &&
    normalizedNearLongitude <= 180;

  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const wardRepo = dataSource.getRepository(HcmWardEntity);
  const queryLimit = hasGeoCoordinates
    ? Math.min(Math.max(normalizedLimit * 4, 120), MAX_NEARBY_QUERY_LIMIT)
    : normalizedLimit;

  const query = itemRepo
    .createQueryBuilder('item')
    .orderBy('item.createdAt', 'DESC')
    .take(queryLimit);

  if (normalizedKeyword) {
    query.andWhere(
      '(item.itemName ILIKE :keyword OR item.description ILIKE :keyword OR item.location ILIKE :keyword)',
      {
        keyword: `%${normalizedKeyword}%`
      }
    );
  }

  if (normalizedSellerGoogleId) {
    query.andWhere('item.sellerGoogleId = :sellerGoogleId', {
      sellerGoogleId: normalizedSellerGoogleId
    });
  } else {
    query.andWhere('item.listingStatus = :activeStatus', {
      activeStatus: LISTING_STATUS.ACTIVE
    });
  }

  if (normalizedNearWardCode && !hasGeoCoordinates) {
    query
      .addSelect('CASE WHEN item.ward_code = :nearWardCode THEN 0 ELSE 1 END', 'near_rank')
      .setParameter('nearWardCode', normalizedNearWardCode)
      .orderBy('near_rank', 'ASC')
      .addOrderBy('item.createdAt', 'DESC');
  }

  const rows = await query.getMany();
  let finalRows = rows;

  if (hasGeoCoordinates) {
    const wardCodes = Array.from(
      new Set(
        rows
          .map((item) => item.wardCode)
          .filter((value) => Number.isInteger(value) && value > 0)
      )
    );
    const coordinateMap = await ensureWardCoordinates(wardRepo, wardCodes);

    finalRows = [...rows]
      .map((item) => {
        const coordinates = coordinateMap.get(item.wardCode) || null;
        const distanceKm =
          coordinates &&
          Number.isFinite(coordinates.latitude) &&
          Number.isFinite(coordinates.longitude)
            ? haversineDistanceKm(
                normalizedNearLatitude,
                normalizedNearLongitude,
                coordinates.latitude,
                coordinates.longitude
              )
            : Number.POSITIVE_INFINITY;

        return {
          item,
          distanceKm
        };
      })
      .sort((a, b) => {
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }

        const timeA = new Date(a.item.createdAt).getTime();
        const timeB = new Date(b.item.createdAt).getTime();
        return timeB - timeA;
      })
      .slice(0, normalizedLimit)
      .map((entry) => entry.item);
  }

  return {
    items: finalRows.map(normalizeItem),
    meta: {
      limit: normalizedLimit,
      keyword: normalizedKeyword || null,
      sellerGoogleId: normalizedSellerGoogleId || null,
      nearWardCode: normalizedNearWardCode,
      nearLatitude: hasGeoCoordinates ? normalizedNearLatitude : null,
      nearLongitude: hasGeoCoordinates ? normalizedNearLongitude : null,
      sortMode: hasGeoCoordinates ? 'distance' : normalizedNearWardCode ? 'same_ward' : 'recent'
    }
  };
}

export async function getItemFilterOptions() {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const rows = await itemRepo.find({
    select: {
      price: true,
      conditionLabel: true,
      delivery: true,
      negotiable: true,
      listingStatus: true
    }
  });

  const prices = rows.map((row) => parsePriceNumber(row.price)).filter((value) => value > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const conditions = Array.from(new Set(rows.map((row) => normalizeText(row.conditionLabel)).filter(Boolean)));
  const deliveries = Array.from(new Set(rows.map((row) => normalizeText(row.delivery)).filter(Boolean)));
  const negotiables = Array.from(new Set(rows.map((row) => normalizeText(row.negotiable)).filter(Boolean)));

  return {
    priceRange: {
      min: minPrice,
      max: maxPrice
    },
    conditions,
    deliveries,
    negotiables,
    statuses: LISTING_STATUS_VALUES,
    totalItems: rows.length
  };
}

export async function getSimilarItems({ itemId, limit = 8 }) {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const target = await itemRepo.findOneBy({ id: itemId });

  if (!target) {
    return [];
  }

  const parsedLimit = Number.parseInt(String(limit || ''), 10);
  const safeLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 8 : Math.min(parsedLimit, 20);

  const query = itemRepo
    .createQueryBuilder('item')
    .where('item.id != :itemId', { itemId })
    .andWhere('item.listingStatus = :status', { status: LISTING_STATUS.ACTIVE })
    .orderBy('item.createdAt', 'DESC')
    .take(safeLimit);

  if (Number.isInteger(target.wardCode) && target.wardCode > 0) {
    query.addSelect('CASE WHEN item.ward_code = :targetWard THEN 0 ELSE 1 END', 'near_rank')
      .setParameter('targetWard', target.wardCode)
      .orderBy('near_rank', 'ASC')
      .addOrderBy('item.createdAt', 'DESC');
  }

  if (normalizeText(target.conditionLabel)) {
    query.addSelect('CASE WHEN item.condition_label = :targetCondition THEN 0 ELSE 1 END', 'condition_rank')
      .setParameter('targetCondition', target.conditionLabel)
      .addOrderBy('condition_rank', 'ASC');
  }

  const rows = await query.getMany();
  return rows.map(normalizeItem);
}

export async function setItemFavorite({ itemId, userGoogleId, favorite }) {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const favoriteRepo = dataSource.getRepository(ItemFavoriteEntity);
  const item = await itemRepo.findOneBy({ id: itemId });

  if (!item) {
    return {
      ok: false,
      reason: 'not_found',
      isFavorited: false
    };
  }

  if (favorite) {
    await favoriteRepo.upsert(
      {
        itemId,
        userGoogleId
      },
      {
        conflictPaths: ['itemId', 'userGoogleId'],
        skipUpdateIfNoValuesChanged: true
      }
    );
  } else {
    await favoriteRepo.delete({ itemId, userGoogleId });
  }

  return {
    ok: true,
    reason: '',
    isFavorited: Boolean(favorite)
  };
}

export async function listFavoriteItemsForUser({ userGoogleId, limit = 100 }) {
  const dataSource = await getDataSource();
  const favoriteRepo = dataSource.getRepository(ItemFavoriteEntity);
  const itemRepo = dataSource.getRepository(ItemEntity);
  const parsedLimit = Number.parseInt(String(limit || ''), 10);
  const safeLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 100 : Math.min(parsedLimit, 200);

  const favorites = await favoriteRepo.find({
    where: {
      userGoogleId
    },
    order: {
      createdAt: 'DESC'
    },
    take: safeLimit
  });

  if (!favorites.length) {
    return [];
  }

  const itemIds = favorites.map((favorite) => favorite.itemId);
  const items = await itemRepo
    .createQueryBuilder('item')
    .where('item.id IN (:...itemIds)', { itemIds })
    .getMany();
  const map = new Map(items.map((item) => [item.id, item]));

  return favorites
    .map((favorite) => map.get(favorite.itemId))
    .filter(Boolean)
    .map(normalizeItem);
}

export async function updateItemListingStatus({ itemId, userGoogleId, status }) {
  const nextStatus = assertItemStatus(status);
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const existing = await itemRepo.findOneBy({ id: itemId });

  if (!existing) {
    return { updated: false, reason: 'not_found', item: null };
  }

  if (existing.sellerGoogleId !== userGoogleId) {
    return { updated: false, reason: 'forbidden', item: null };
  }

  existing.listingStatus = nextStatus;

  if (nextStatus === LISTING_STATUS.ACTIVE) {
    existing.reservedByGoogleId = null;
    existing.reservedAt = null;
    existing.soldToGoogleId = null;
    existing.soldAt = null;
  }

  if (nextStatus === LISTING_STATUS.RESERVED && !existing.reservedAt) {
    existing.reservedAt = new Date();
  }

  if (nextStatus === LISTING_STATUS.SOLD && !existing.soldAt) {
    existing.soldAt = new Date();
    if (!existing.soldToGoogleId) {
      existing.soldToGoogleId = existing.reservedByGoogleId || null;
    }
    existing.reservedByGoogleId = null;
    existing.reservedAt = null;
  }

  if (nextStatus === LISTING_STATUS.HIDDEN) {
    existing.reservedByGoogleId = null;
    existing.reservedAt = null;
  }

  const saved = await itemRepo.save(existing);
  return { updated: true, reason: '', item: normalizeItem(saved) };
}

export async function reserveItem({ itemId, userGoogleId }) {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const existing = await itemRepo.findOneBy({ id: itemId });

  if (!existing) {
    return { updated: false, reason: 'not_found', item: null };
  }

  if (existing.sellerGoogleId === userGoogleId) {
    return { updated: false, reason: 'cannot_reserve_own_item', item: null };
  }

  if (existing.listingStatus !== LISTING_STATUS.ACTIVE) {
    return { updated: false, reason: 'not_available', item: normalizeItem(existing) };
  }

  existing.listingStatus = LISTING_STATUS.RESERVED;
  existing.reservedByGoogleId = userGoogleId;
  existing.reservedAt = new Date();

  const saved = await itemRepo.save(existing);
  return { updated: true, reason: '', item: normalizeItem(saved) };
}

export async function unreserveItem({ itemId, userGoogleId }) {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const existing = await itemRepo.findOneBy({ id: itemId });

  if (!existing) {
    return { updated: false, reason: 'not_found', item: null };
  }

  const canUnreserve =
    existing.sellerGoogleId === userGoogleId || existing.reservedByGoogleId === userGoogleId;

  if (!canUnreserve) {
    return { updated: false, reason: 'forbidden', item: null };
  }

  existing.listingStatus = LISTING_STATUS.ACTIVE;
  existing.reservedByGoogleId = null;
  existing.reservedAt = null;

  const saved = await itemRepo.save(existing);
  return { updated: true, reason: '', item: normalizeItem(saved) };
}

export async function markItemSold({ itemId, sellerGoogleId, buyerGoogleId }) {
  const dataSource = await getDataSource();
  const itemRepo = dataSource.getRepository(ItemEntity);
  const existing = await itemRepo.findOneBy({ id: itemId });

  if (!existing) {
    return { updated: false, reason: 'not_found', item: null };
  }

  if (existing.sellerGoogleId !== sellerGoogleId) {
    return { updated: false, reason: 'forbidden', item: null };
  }

  existing.listingStatus = LISTING_STATUS.SOLD;
  existing.soldAt = new Date();
  existing.soldToGoogleId = normalizeText(buyerGoogleId) || existing.reservedByGoogleId || null;
  existing.reservedByGoogleId = null;
  existing.reservedAt = null;

  const saved = await itemRepo.save(existing);
  return { updated: true, reason: '', item: normalizeItem(saved) };
}
