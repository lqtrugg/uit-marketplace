import { Router } from 'express';
import { requireAuthenticatedUser } from '../services/authService.js';
import {
  createSignedUploadUrl,
  getLocalUploadTicket,
  saveLocalUploadByTicket,
  StorageInputError
} from '../services/storageService.js';

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
storageRoutes.put(
  '/local/:ticket',
  async (request, response) => {
    try {
      const ticket = request.params?.ticket || '';
      const contentType = request.headers['content-type'] || '';
      const chunks = [];

      for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);
      const upload = await saveLocalUploadByTicket({
        ticket,
        buffer,
        contentType
      });

      return response.status(201).json({ ok: true, upload });
    } catch (error) {
      if (error instanceof StorageInputError) {
        return response.status(400).json({ error: error.message });
      }

      console.error('[STORAGE_LOCAL_UPLOAD_ERROR]', error);
      return response.status(500).json({ error: 'Failed to upload local media file.' });
    }
  }
);

storageRoutes.get('/local/:ticket/file', async (request, response) => {
  try {
    const ticket = request.params?.ticket || '';
    const payload = getLocalUploadTicket(ticket);

    if (!payload.uploadedAt) {
      return response.status(404).json({ error: 'Uploaded file not found.' });
    }

    return response.sendFile(payload.filePath, {
      headers: {
        'Content-Type': payload.contentType
      }
    });
  } catch (error) {
    if (error instanceof StorageInputError) {
      return response.status(404).json({ error: error.message });
    }

    console.error('[STORAGE_LOCAL_FILE_ERROR]', error);
    return response.status(500).json({ error: 'Failed to read local uploaded file.' });
  }
});

export default storageRoutes;
