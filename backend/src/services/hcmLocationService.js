import { getDataSource } from '../core/dataSource.js';
import { HcmWardEntity } from '../entities/HcmWardEntity.js';

const HCM_PROVINCE_CODE = 79;
const HCM_SOURCE_URL =
  'https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-quyet-so-1685-nq-ubtvqh15-sap-xep-cac-dvhc-cap-xa-cua-thanh-pho-ho-chi-minh-nam-2025-119250616211341304.htm';
const HCM_MERGED_DISTRICT_LABEL = 'Sau sáp nhập 2025';
const SYNTHETIC_DISTRICT_CODE = 79000;
const SYNTHETIC_WARD_CODE_OFFSET = 790000;
const DEFAULT_LIST_LIMIT = 200;
const MAX_LIST_LIMIT = 2000;

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function toApiJson(response) {
  if (!response.ok) {
    throw new Error(`Source responded with HTTP ${response.status}`);
  }

  return response.json();
}

function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMergedUnitsFromResolutionText(text) {
  const units = [];

  const formedMatches = [
    ...text.matchAll(/có tên gọi là\s+(phường|xã|đặc khu)\s+([^.;]+?)(?=\s*[.;])/gi)
  ];

  for (const match of formedMatches) {
    const unitType = normalizeText(match[1]).toLowerCase();
    const unitName = normalizeText(match[2]);

    if (!unitType || !unitName) {
      continue;
    }

    units.push({
      unitType,
      unitName
    });
  }

  // This article has a unicode-variant phrase for the special district that may bypass the regex.
  if (text.toLowerCase().includes('đặc khu côn đảo')) {
    const exists = units.some(
      (item) => item.unitType === 'đặc khu' && normalizeText(item.unitName) === 'Côn Đảo'
    );

    if (!exists) {
      units.push({
        unitType: 'đặc khu',
        unitName: 'Côn Đảo'
      });
    }
  }

  const unchangedMatch = text.match(/không thực hiện sắp xếp là\s+([^\.]+)\./i);

  if (unchangedMatch?.[1]) {
    const raw = normalizeText(unchangedMatch[1]);
    const phuongMatch = raw.match(/phường\s+([^,]+)/i);

    if (phuongMatch?.[1]) {
      units.push({
        unitType: 'phường',
        unitName: normalizeText(phuongMatch[1])
      });
    }

    const xaPart = raw.replace(/.*các xã\s+/i, '');
    const xaNames = xaPart
      .split(',')
      .map((item) => normalizeText(item))
      .filter(Boolean);

    for (const xaName of xaNames) {
      units.push({
        unitType: 'xã',
        unitName: xaName
      });
    }
  }

  const deduped = new Map();

  for (const item of units) {
    const key = `${item.unitType}::${item.unitName.toLowerCase()}`;

    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values());
}

async function fetchMergedHcmUnits() {
  const response = await fetch(HCM_SOURCE_URL, {
    method: 'GET',
    headers: {
      Accept: 'text/html'
    }
  });

  if (!response.ok) {
    throw new Error(`Source responded with HTTP ${response.status}`);
  }

  const html = await response.text();
  const text = htmlToPlainText(html);
  const units = parseMergedUnitsFromResolutionText(text);

  if (units.length < 160) {
    throw new Error('Merged units parser returned too few results; source format may have changed.');
  }

  return units;
}

function buildWardRows(units, sourceUrl) {
  return units.map((unit, index) => ({
    provinceCode: HCM_PROVINCE_CODE,
    provinceName: 'Thành phố Hồ Chí Minh',
    districtCode: SYNTHETIC_DISTRICT_CODE,
    districtName: HCM_MERGED_DISTRICT_LABEL,
    districtDivisionType: 'thành phố',
    wardCode: SYNTHETIC_WARD_CODE_OFFSET + index + 1,
    wardName: unit.unitName,
    wardDivisionType: unit.unitType,
    sourceUrl,
    syncedAt: new Date()
  }));
}

function normalizeWard(record) {
  return {
    id: record.id,
    provinceCode: record.provinceCode,
    provinceName: record.provinceName,
    districtCode: record.districtCode,
    districtName: record.districtName,
    districtDivisionType: record.districtDivisionType || '',
    wardCode: record.wardCode,
    wardName: record.wardName,
    wardDivisionType: record.wardDivisionType || '',
    sourceUrl: record.sourceUrl,
    syncedAt: record.syncedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function crawlAndSyncHcmWards() {
  const mergedUnits = await fetchMergedHcmUnits();
  const wardRows = buildWardRows(mergedUnits, HCM_SOURCE_URL);

  if (wardRows.length === 0) {
    throw new Error('No ward rows extracted from source payload.');
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(HcmWardEntity);

  const wardCodes = wardRows.map((item) => item.wardCode);

  await repository.upsert(wardRows, {
    conflictPaths: ['wardCode'],
    skipUpdateIfNoValuesChanged: false
  });

  // Keep local table in sync with source snapshot to avoid stale wards.
  await repository
    .createQueryBuilder()
    .delete()
    .where('province_code = :provinceCode', { provinceCode: HCM_PROVINCE_CODE })
    .andWhere('ward_code NOT IN (:...wardCodes)', { wardCodes })
    .execute();

  const total = await repository.count({
    where: {
      provinceCode: HCM_PROVINCE_CODE
    }
  });

  return {
    sourceUrl: HCM_SOURCE_URL,
    crawled: wardRows.length,
    total
  };
}

export async function listHcmWards(options = {}) {
  const districtCode = toPositiveInteger(options.districtCode, 0);
  const keyword = normalizeText(options.keyword).toLowerCase();
  const requestedLimit = toPositiveInteger(options.limit, DEFAULT_LIST_LIMIT);
  const limit = Math.min(requestedLimit, MAX_LIST_LIMIT);

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(HcmWardEntity);

  const query = repository
    .createQueryBuilder('ward')
    .where('ward.province_code = :provinceCode', { provinceCode: HCM_PROVINCE_CODE });

  if (districtCode > 0) {
    query.andWhere('ward.district_code = :districtCode', { districtCode });
  }

  if (keyword) {
    query.andWhere('(LOWER(ward.ward_name) LIKE :keyword OR LOWER(ward.district_name) LIKE :keyword)', {
      keyword: `%${keyword}%`
    });
  }

  query.orderBy('ward.district_code', 'ASC').addOrderBy('ward.ward_name', 'ASC').take(limit);

  const rows = await query.getMany();

  return {
    wards: rows.map(normalizeWard),
    meta: {
      districtCode: districtCode || null,
      keyword,
      limit
    }
  };
}
