import { Router } from 'express';
import { requireAuthenticatedUser } from '../services/authService.js';
import { createSignedUploadUrl, StorageInputError } from '../services/storageService.js';

const storageRoutes = Router();

async function handleCreateUpload(request, response) {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const upload = await createSignedUploadUrl({
      user,
      fileName: request.body?.fileName,
      contentType: request.body?.contentType,
      fileSize: request.body?.fileSize
    });

    return response.status(201).json({ upload });
  } catch (error) {
    if (error instanceof StorageInputError) {
      return response.status(400).json({ error: error.message });
    }

    console.error('[STORAGE_SIGNED_URL_ERROR]', error);
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    return response.status(500).json({
      error: 'Failed to prepare upload URL.',
      ...(isDev ? { detail: error?.message || 'Unknown storage error.' } : {})
    });
  }
}

storageRoutes.post('/', handleCreateUpload);
storageRoutes.post('/signed-upload-url', handleCreateUpload);

export default storageRoutes;
