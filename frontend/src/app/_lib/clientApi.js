export function formatTime(value) {
  if (!value) {
    return 'Unknown time';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown time';
  }

  return parsed.toLocaleString();
}

export function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const AUTH_TOKEN_STORAGE_KEY = 'uit_jwt_token';
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const SUPPORTED_MEDIA_PREFIXES = ['image/', 'video/'];

function buildApiUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${apiBaseUrl}${url}`;
  }

  return `${apiBaseUrl}/${url}`;
}

export function getStoredAuthToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
}

export function setStoredAuthToken(token) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function logoutCurrentSession() {
  await requestJson('/api/sessions/current', {
    method: 'DELETE'
  });
  clearStoredAuthToken();
}

export async function requestJson(url, options = {}) {
  let response;
  const token = getStoredAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    response = await fetch(buildApiUrl(url), {
      cache: 'no-store',
      credentials: 'include',
      ...options,
      headers
    });
  } catch {
    throw new Error(
      `Cannot reach API server at ${apiBaseUrl}. Start backend or update NEXT_PUBLIC_API_BASE_URL.`
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

function isSupportedMediaType(contentType) {
  return SUPPORTED_MEDIA_PREFIXES.some((prefix) => contentType.startsWith(prefix));
}

function getBrowserOriginLabel() {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return 'your frontend origin';
  }

  return window.location.origin;
}

async function buildCloudUploadHttpError(uploadResponse, fileName) {
  const statusLine = `${uploadResponse.status}${uploadResponse.statusText ? ` ${uploadResponse.statusText}` : ''}`;
  let responseBody = '';

  try {
    responseBody = (await uploadResponse.text()).trim();
  } catch {
    responseBody = '';
  }

  const shortenedResponse =
    responseBody.length > 220 ? `${responseBody.slice(0, 220).trim()}...` : responseBody;
  const responseDetail = shortenedResponse ? ` Response: ${shortenedResponse}` : '';

  if (uploadResponse.status === 403) {
    return (
      `Cloud upload failed for ${fileName} (HTTP ${statusLine}). ` +
      'Check signed URL expiry, Content-Type, and bucket CORS.' +
      responseDetail
    );
  }

  return `Cloud upload failed for ${fileName} (HTTP ${statusLine}).${responseDetail}`;
}

export async function requestSignedUpload({ fileName, contentType, fileSize }) {
  const payload = await requestJson('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({
      fileName,
      contentType,
      fileSize
    })
  });

  const upload = payload?.upload;

  if (!upload?.uploadUrl || !upload?.publicUrl) {
    throw new Error('Storage service did not return a valid upload URL.');
  }

  return upload;
}

export async function uploadItemMediaFile(file) {
  if (!file || typeof file !== 'object') {
    throw new Error('Invalid media file.');
  }

  const fileName = typeof file.name === 'string' ? file.name.trim() : '';
  const contentType = typeof file.type === 'string' ? file.type.trim().toLowerCase() : '';
  const fileSize = typeof file.size === 'number' ? file.size : 0;

  if (!fileName) {
    throw new Error('Media file name is required.');
  }

  if (!contentType || !isSupportedMediaType(contentType)) {
    throw new Error(`Unsupported media type for ${fileName}. Only image/video are allowed.`);
  }

  if (!fileSize || Number.isNaN(fileSize) || fileSize <= 0) {
    throw new Error(`Invalid file size for ${fileName}.`);
  }

  const signedUpload = await requestSignedUpload({
    fileName,
    contentType,
    fileSize
  });

  let uploadResponse;

  try {
    uploadResponse = await fetch(signedUpload.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType
      },
      body: file
    });
  } catch (error) {
    const detail = error instanceof Error && error.message ? error.message : 'Unknown browser network error.';
    throw new Error(
      `Cannot upload ${fileName} to cloud storage. Browser could not reach signed URL (${detail}). ` +
        `Check internet access and bucket CORS for ${getBrowserOriginLabel()}.`
    );
  }

  if (!uploadResponse.ok) {
    throw new Error(await buildCloudUploadHttpError(uploadResponse, fileName));
  }

  return {
    publicUrl: signedUpload.publicUrl,
    contentType: signedUpload.contentType || contentType,
    objectPath: signedUpload.objectPath || ''
  };
}

export async function listItems(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    query.set(key, String(value));
  });

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await requestJson(`/api/items${suffix}`);

  if (!Array.isArray(payload?.items)) {
    throw new Error('Invalid item list payload.');
  }

  return payload;
}

export async function getItemDetail(itemId) {
  const payload = await requestJson(`/api/items/${itemId}`);

  if (!payload?.item?.id) {
    throw new Error('Invalid item detail payload.');
  }

  return payload.item;
}

export async function getItemFilterOptions() {
  return requestJson('/api/items/filter-options');
}

export async function getSimilarItems(itemId, limit = 8) {
  const payload = await requestJson(`/api/items/${itemId}/similar?limit=${limit}`);
  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function listMyFavoriteItems(limit = 200) {
  const payload = await requestJson(`/api/items/favorites/mine?limit=${Math.max(1, Math.min(limit, 200))}`);
  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function setItemFavorite(itemId, favorite) {
  const payload = await requestJson(`/api/items/${itemId}/favorite`, {
    method: 'PUT',
    body: JSON.stringify({
      favorite: Boolean(favorite)
    })
  });

  return Boolean(payload?.isFavorited);
}

export async function reserveItem(itemId) {
  const payload = await requestJson(`/api/items/${itemId}/reserve`, {
    method: 'POST'
  });

  return payload?.item || null;
}

export async function unreserveItem(itemId) {
  const payload = await requestJson(`/api/items/${itemId}/unreserve`, {
    method: 'POST'
  });

  return payload?.item || null;
}

export async function markItemSold(itemId, buyerGoogleId = '') {
  const payload = await requestJson(`/api/items/${itemId}/sold`, {
    method: 'POST',
    body: JSON.stringify({
      buyerGoogleId
    })
  });

  return payload?.item || null;
}

export async function updateItemStatus(itemId, status) {
  const payload = await requestJson(`/api/items/${itemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status
    })
  });

  return payload?.item || null;
}

export async function makeOffer({ itemId, offeredPrice, message }) {
  const payload = await requestJson('/api/offers', {
    method: 'POST',
    body: JSON.stringify({
      itemId,
      offeredPrice,
      message
    })
  });

  if (!payload?.offer?.id) {
    throw new Error('Invalid offer payload.');
  }

  return payload.offer;
}

export async function listSellerOffers({ itemId, status, limit = 300 } = {}) {
  const query = new URLSearchParams();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Number(limit), 500)) : 300;
  query.set('limit', String(safeLimit));

  if (itemId !== undefined && itemId !== null && itemId !== '') {
    query.set('itemId', String(itemId));
  }

  if (status) {
    query.set('status', String(status));
  }

  const payload = await requestJson(`/api/offers/seller?${query.toString()}`);
  return Array.isArray(payload?.offers) ? payload.offers : [];
}

export async function acceptOffer(offerId) {
  const payload = await requestJson(`/api/offers/${offerId}/accept`, {
    method: 'POST'
  });

  return {
    offer: payload?.offer || null,
    item: payload?.item || null
  };
}

export async function listMyOffers({ itemId, status, limit = 300 } = {}) {
  const query = new URLSearchParams();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Number(limit), 500)) : 300;
  query.set('limit', String(safeLimit));

  if (itemId !== undefined && itemId !== null && itemId !== '') {
    query.set('itemId', String(itemId));
  }

  if (status) {
    query.set('status', String(status));
  }

  const payload = await requestJson(`/api/offers/mine?${query.toString()}`);
  return Array.isArray(payload?.offers) ? payload.offers : [];
}

export async function openDirectChat(targetGoogleId) {
  const normalized = String(targetGoogleId || '').trim();

  if (!normalized) {
    throw new Error('Target user id is required.');
  }

  const payload = await requestJson(`/api/chats/direct/${encodeURIComponent(normalized)}`, {
    method: 'POST'
  });

  if (!payload?.chat?.id) {
    throw new Error('Invalid chat payload.');
  }

  return payload.chat;
}

export async function listMyChats(limit = 100) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Number(limit), 200)) : 100;
  const payload = await requestJson(`/api/chats?limit=${safeLimit}`);
  return Array.isArray(payload?.chats) ? payload.chats : [];
}

export async function listChatMessages(chatId, limit = 200) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Number(limit), 300)) : 200;
  const payload = await requestJson(`/api/chats/${chatId}/messages?limit=${safeLimit}`);
  return {
    chat: payload?.chat || null,
    messages: Array.isArray(payload?.messages) ? payload.messages : []
  };
}

export async function sendChatMessage(chatId, content) {
  const payload = await requestJson(`/api/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });

  if (!payload?.message?.id) {
    throw new Error('Invalid message payload.');
  }

  return payload.message;
}
