import { createHash, randomBytes } from 'node:crypto';
import { In } from 'typeorm';
import { getDataSource } from '../core/dataSource.js';
import { DepositEntity } from '../entities/DepositEntity.js';
import { ItemEntity } from '../entities/ItemEntity.js';

const DUMMY_QR_GRID_SIZE = 25;
const DUMMY_QR_CELL_SIZE = 8;
const DUMMY_QR_PADDING = 3;
const DUMMY_DEPOSIT_MIN = 1000;
const DUMMY_DEPOSIT_MAX = 500_000_000;
const DUMMY_DEPOSIT_DEFAULT = 50_000;
const DUMMY_DEPOSIT_SESSION_TTL_MS = 10 * 60 * 1000;
const ITEM_LISTING_STATUS = {
  ACTIVE: 'active',
  RESERVED: 'reserved'
};

function createPaymentError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value || ''), 10);

  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
}

function createFinderPatternSet(offsetX, offsetY) {
  const points = new Set();

  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const isBorder = x === 0 || y === 0 || x === 6 || y === 6;
      const isCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;

      if (isBorder || isCenter) {
        points.add(`${offsetX + x},${offsetY + y}`);
      }
    }
  }

  return points;
}

function createDummyQrDataUrl(content) {
  const hash = createHash('sha256').update(content).digest();
  const darkPoints = new Set();
  const finderTopLeft = createFinderPatternSet(0, 0);
  const finderTopRight = createFinderPatternSet(DUMMY_QR_GRID_SIZE - 7, 0);
  const finderBottomLeft = createFinderPatternSet(0, DUMMY_QR_GRID_SIZE - 7);
  const finderPoints = new Set([...finderTopLeft, ...finderTopRight, ...finderBottomLeft]);

  for (let y = 0; y < DUMMY_QR_GRID_SIZE; y += 1) {
    for (let x = 0; x < DUMMY_QR_GRID_SIZE; x += 1) {
      const key = `${x},${y}`;

      if (finderPoints.has(key)) {
        darkPoints.add(key);
        continue;
      }

      const hashIndex = (x * 13 + y * 7) % hash.length;
      const bitIndex = (x + y) % 8;
      const bit = (hash[hashIndex] >> bitIndex) & 1;

      if (bit === 1) {
        darkPoints.add(key);
      }
    }
  }

  const canvasSize = (DUMMY_QR_GRID_SIZE + DUMMY_QR_PADDING * 2) * DUMMY_QR_CELL_SIZE;
  const rects = [];

  darkPoints.forEach((point) => {
    const [xRaw, yRaw] = point.split(',');
    const x = Number.parseInt(xRaw, 10);
    const y = Number.parseInt(yRaw, 10);
    const drawX = (x + DUMMY_QR_PADDING) * DUMMY_QR_CELL_SIZE;
    const drawY = (y + DUMMY_QR_PADDING) * DUMMY_QR_CELL_SIZE;

    rects.push(
      `<rect x="${drawX}" y="${drawY}" width="${DUMMY_QR_CELL_SIZE}" height="${DUMMY_QR_CELL_SIZE}" fill="#000000" />`
    );
  });

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" shape-rendering="crispEdges">`,
    `<rect x="0" y="0" width="${canvasSize}" height="${canvasSize}" fill="#ffffff" />`,
    ...rects,
    '</svg>'
  ].join('');

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function normalizeItemSummary(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    itemName: item.itemName,
    price: item.price,
    sellerName: item.sellerName,
    imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : []
  };
}

function normalizeDeposit(deposit, item = null) {
  return {
    id: deposit.id,
    referenceId: deposit.referenceId,
    buyerGoogleId: deposit.buyerGoogleId,
    itemId: deposit.itemId,
    amount: deposit.amount,
    currency: deposit.currency || 'VND',
    status: deposit.status || 'pending',
    expiresAt: deposit.expiresAt,
    confirmedAt: deposit.confirmedAt || null,
    createdAt: deposit.createdAt,
    updatedAt: deposit.updatedAt,
    item: normalizeItemSummary(item)
  };
}

async function getRepos() {
  const dataSource = await getDataSource();

  return {
    depositRepo: dataSource.getRepository(DepositEntity),
    itemRepo: dataSource.getRepository(ItemEntity)
  };
}

export async function createDummyDepositSession({ userGoogleId, itemId, amount }) {
  const parsedItemId = parsePositiveInteger(itemId);

  if (!parsedItemId) {
    throw createPaymentError('Item id is required.', 'INVALID_ITEM_ID');
  }

  const requestedAmount = parsePositiveInteger(amount);
  const normalizedAmount = requestedAmount || DUMMY_DEPOSIT_DEFAULT;

  if (normalizedAmount < DUMMY_DEPOSIT_MIN || normalizedAmount > DUMMY_DEPOSIT_MAX) {
    throw createPaymentError(
      `Dummy deposit amount must be between ${DUMMY_DEPOSIT_MIN} and ${DUMMY_DEPOSIT_MAX}.`,
      'INVALID_AMOUNT'
    );
  }

  const { depositRepo, itemRepo } = await getRepos();
  const item = await itemRepo.findOneBy({ id: parsedItemId });

  if (!item) {
    throw createPaymentError('Item not found.', 'ITEM_NOT_FOUND');
  }

  const referenceId = `DUMMY-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const expiresAt = new Date(Date.now() + DUMMY_DEPOSIT_SESSION_TTL_MS);
  const qrPayload = JSON.stringify({
    type: 'dummy-deposit',
    referenceId,
    itemId: parsedItemId,
    amount: normalizedAmount,
    currency: 'VND',
    userGoogleId,
    expiresAt: expiresAt.toISOString()
  });

  const created = depositRepo.create({
    referenceId,
    buyerGoogleId: userGoogleId,
    itemId: parsedItemId,
    amount: normalizedAmount,
    currency: 'VND',
    status: 'pending',
    expiresAt,
    confirmedAt: null
  });
  const saved = await depositRepo.save(created);

  return {
    ...normalizeDeposit(saved, item),
    qrCodeDataUrl: createDummyQrDataUrl(qrPayload),
    note: 'Dummy payment service only. No real money movement.'
  };
}

export async function confirmDummyDepositByReference({ userGoogleId, referenceId }) {
  const normalizedReferenceId = String(referenceId || '').trim();

  if (!normalizedReferenceId) {
    throw createPaymentError('Reference id is required.', 'INVALID_REFERENCE');
  }

  const { depositRepo, itemRepo } = await getRepos();
  const row = await depositRepo.findOneBy({
    referenceId: normalizedReferenceId,
    buyerGoogleId: userGoogleId
  });

  if (!row) {
    throw createPaymentError('Deposit session not found.', 'DEPOSIT_NOT_FOUND');
  }

  const now = Date.now();

  if (row.status !== 'confirmed' && new Date(row.expiresAt).getTime() <= now) {
    throw createPaymentError('Deposit session expired. Please create a new session.', 'DEPOSIT_EXPIRED');
  }

  if (row.status !== 'confirmed') {
    row.status = 'confirmed';
    row.confirmedAt = new Date();
    await depositRepo.save(row);
  }

  const item = await itemRepo.findOneBy({ id: row.itemId });

  if (item && item.listingStatus === ITEM_LISTING_STATUS.ACTIVE) {
    item.listingStatus = ITEM_LISTING_STATUS.RESERVED;
    item.reservedByGoogleId = userGoogleId;
    item.reservedAt = item.reservedAt || new Date();
    await itemRepo.save(item);
  }

  return normalizeDeposit(row, item);
}

export async function listDummyDepositsForUser({ userGoogleId, limit }) {
  const parsedLimit = parsePositiveInteger(limit);
  const safeLimit = Math.min(parsedLimit || 100, 200);
  const { depositRepo, itemRepo } = await getRepos();
  const rows = await depositRepo.find({
    where: {
      buyerGoogleId: userGoogleId
    },
    order: {
      createdAt: 'DESC'
    },
    take: safeLimit
  });
  const itemIds = Array.from(
    new Set(
      rows
        .map((row) => row.itemId)
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
  let itemMap = new Map();

  if (itemIds.length) {
    const itemRows = await itemRepo.findBy({
      id: In(itemIds)
    });
    itemMap = new Map(itemRows.map((item) => [item.id, item]));
  }

  return rows.map((row) => normalizeDeposit(row, itemMap.get(row.itemId) || null));
}
