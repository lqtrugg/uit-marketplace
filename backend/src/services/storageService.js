import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';

const ALLOWED_MEDIA_PREFIXES = ['image/', 'video/'];
const DEFAULT_SIGNED_URL_EXPIRES_SECONDS = 15 * 60;
const DEFAULT_MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;
const DEFAULT_LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

export class StorageInputError extends Error {}

function getStorageDriver() {
  const configured = (process.env.STORAGE_DRIVER || '').trim().toLowerCase();

  if (configured === 'local') {
    return 'local';
  }

  if (configured === 'gcs') {
    return 'gcs';
  }

  return getBucketName() ? 'gcs' : 'local';
}

function normalizePrivateKey(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.replace(/\\n/g, '\n');
}

function getSignedUrlExpiresSeconds() {
  const parsed = Number.parseInt(process.env.GCS_SIGNED_URL_EXPIRES_SECONDS || '', 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_SIGNED_URL_EXPIRES_SECONDS;
  }

  return Math.min(parsed, 60 * 60);
}

function getMaxFileSizeBytes() {
  const parsed = Number.parseInt(process.env.GCS_MAX_FILE_SIZE_BYTES || '', 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_MAX_FILE_SIZE_BYTES;
  }

  return parsed;
}

function getBucketName() {
  return (process.env.GCS_BUCKET_NAME || '').trim();
}

function getApiBaseUrl() {
  const explicit = (process.env.BACKEND_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');

  if (explicit) {
    return explicit;
  }

  const port = Number.parseInt(process.env.PORT || '4000', 10);
  return `http://localhost:${Number.isNaN(port) ? 4000 : port}`;
}

function getPublicBaseUrl(bucketName) {
  const explicit = (process.env.GCS_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');

  if (explicit) {
    return explicit;
  }

  return `https://storage.googleapis.com/${bucketName}`;
}

function buildStorageClient() {
  const globalStore = globalThis;

  if (globalStore.__gcsStorageClient) {
    return globalStore.__gcsStorageClient;
  }

  const projectId = (process.env.GCS_PROJECT_ID || '').trim() || undefined;
  const clientEmail = (process.env.GCS_CLIENT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(process.env.GCS_PRIVATE_KEY || '');

  if (clientEmail && privateKey) {
    globalStore.__gcsStorageClient = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey
      }
    });

    return globalStore.__gcsStorageClient;
  }

  globalStore.__gcsStorageClient = new Storage({
    projectId
  });

  return globalStore.__gcsStorageClient;
}

function assertBucketConfigured() {
  const bucketName = getBucketName();

  if (!bucketName) {
    throw new StorageInputError('GCS_BUCKET_NAME is not configured.');
  }

  return bucketName;
}

function getLocalUploadDir() {
  const explicit = (process.env.LOCAL_UPLOAD_DIR || '').trim();

  if (!explicit) {
    return DEFAULT_LOCAL_UPLOAD_DIR;
  }

  return path.isAbsolute(explicit) ? explicit : path.resolve(process.cwd(), explicit);
}

function getLocalTicketStore() {
  const globalStore = globalThis;

  if (!globalStore.__localUploadTicketStore) {
    globalStore.__localUploadTicketStore = new Map();
  }

  return globalStore.__localUploadTicketStore;
}

function sanitizeFileName(fileName) {
  const raw = path.basename(String(fileName || '').trim());
  const normalized = raw.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  return normalized || 'upload.bin';
}

function validateMediaType(contentType) {
  const normalized = String(contentType || '').trim().toLowerCase();

  if (!normalized) {
    throw new StorageInputError('contentType is required.');
  }

  const allowed = ALLOWED_MEDIA_PREFIXES.some((prefix) => normalized.startsWith(prefix));

  if (!allowed) {
    throw new StorageInputError('Only image/* and video/* uploads are supported.');
  }

  return normalized;
}

function validateFileSize(fileSize) {
  if (fileSize === undefined || fileSize === null || fileSize === '') {
    return null;
  }

  const parsed = Number.parseInt(String(fileSize), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new StorageInputError('fileSize must be a positive integer.');
  }

  if (parsed > getMaxFileSizeBytes()) {
    throw new StorageInputError(
      `fileSize exceeds the configured limit (${getMaxFileSizeBytes()} bytes).`
    );
  }

  return parsed;
}

function buildObjectPath({ userGoogleId, fileName }) {
  const safeName = sanitizeFileName(fileName);
  const stamp = Date.now();
  const nonce = randomBytes(6).toString('hex');
  const datePrefix = new Date().toISOString().slice(0, 10);

  return `uploads/${datePrefix}/${userGoogleId}/${stamp}-${nonce}-${safeName}`;
}

function buildPublicUrl(baseUrl, objectPath) {
  return `${baseUrl}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
}

function createLocalTicket({ userGoogleId, objectPath, contentType, expiresAt }) {
  const ticket = randomBytes(24).toString('hex');
  const apiBaseUrl = getApiBaseUrl();
  const localUploadDir = getLocalUploadDir();
  const filePath = path.join(localUploadDir, ...objectPath.split('/'));
  const store = getLocalTicketStore();

  store.set(ticket, {
    ticket,
    userGoogleId,
    objectPath,
    contentType,
    expiresAt,
    filePath,
    uploadedAt: null
  });

  return {
    uploadUrl: `${apiBaseUrl}/api/uploads/local/${ticket}`,
    publicUrl: `${apiBaseUrl}/api/uploads/local/${ticket}/file`,
    objectPath,
    bucketName: 'local',
    contentType,
    expiresAt: new Date(expiresAt).toISOString(),
    maxFileSizeBytes: getMaxFileSizeBytes(),
    storageDriver: 'local'
  };
}

export function getLocalUploadTicket(ticket) {
  const key = String(ticket || '').trim();
  const store = getLocalTicketStore();

  if (!key || !store.has(key)) {
    throw new StorageInputError('Upload ticket is invalid.');
  }

  const payload = store.get(key);

  if (Date.now() > payload.expiresAt) {
    store.delete(key);
    throw new StorageInputError('Upload ticket expired.');
  }

  return payload;
}

export async function saveLocalUploadByTicket({ ticket, buffer, contentType }) {
  const payload = getLocalUploadTicket(ticket);
  const normalizedType = validateMediaType(contentType || payload.contentType);

  if (normalizedType !== payload.contentType) {
    throw new StorageInputError(
      `Content-Type mismatch. Expected ${payload.contentType}, received ${normalizedType}.`
    );
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new StorageInputError('Upload body is empty.');
  }

  if (buffer.length > getMaxFileSizeBytes()) {
    throw new StorageInputError(
      `fileSize exceeds the configured limit (${getMaxFileSizeBytes()} bytes).`
    );
  }

  await mkdir(path.dirname(payload.filePath), { recursive: true });
  await writeFile(payload.filePath, buffer);
  payload.uploadedAt = new Date().toISOString();

  return {
    publicUrl: `${getApiBaseUrl()}/api/uploads/local/${payload.ticket}/file`,
    objectPath: payload.objectPath
  };
}

export async function createSignedUploadUrl({ user, fileName, contentType, fileSize }) {
  if (!user?.googleId) {
    throw new StorageInputError('Authenticated user is required.');
  }

  const normalizedFileName = sanitizeFileName(fileName);
  const normalizedContentType = validateMediaType(contentType);
  validateFileSize(fileSize);

  const objectPath = buildObjectPath({
    userGoogleId: user.googleId,
    fileName: normalizedFileName
  });
  const expiresSeconds = getSignedUrlExpiresSeconds();
  const expiresAt = Date.now() + expiresSeconds * 1000;
  const storageDriver = getStorageDriver();

  if (storageDriver === 'local') {
    return createLocalTicket({
      userGoogleId: user.googleId,
      objectPath,
      contentType: normalizedContentType,
      expiresAt
    });
  }

  const bucketName = assertBucketConfigured();
  const storage = buildStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(objectPath);

  let uploadUrl = '';

  try {
    [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType: normalizedContentType
    });
  } catch (error) {
    throw new StorageInputError(
      `GCS signed URL generation failed. Check GCS credentials, bucket IAM, and service account key. Detail: ${error?.message || 'Unknown GCS error.'}`
    );
  }

  return {
    uploadUrl,
    publicUrl: buildPublicUrl(getPublicBaseUrl(bucketName), objectPath),
    objectPath,
    bucketName,
    contentType: normalizedContentType,
    expiresAt: new Date(expiresAt).toISOString(),
    maxFileSizeBytes: getMaxFileSizeBytes(),
    storageDriver: 'gcs'
  };
}
