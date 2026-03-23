import { Router } from 'express';
import {
  applySessionCookie,
  clearSessionCookie,
  createSessionForUser,
  deleteSessionByToken,
  getSessionTokenFromRequest,
  requireAuthenticatedUser,
  upsertUser,
  verifyGoogleCredential
} from '../services/authService.js';

const sessionRoutes = Router();

function getGoogleAuthErrorStatus(errorMessage) {
  if (errorMessage === 'Only @gm.uit.edu.vn accounts are allowed.' || errorMessage === 'Google email is not verified.') {
    return 403;
  }

  if (errorMessage === 'Missing Google credential token.' || errorMessage === 'Invalid Google token payload.') {
    return 400;
  }

  if (errorMessage === 'Google token verification failed.') {
    return 401;
  }

  return 500;
}

sessionRoutes.post('/', async (request, response) => {
  try {
    const credential = request.body?.credential;
    const profile = await verifyGoogleCredential(credential);
    const { user, isNewUser } = await upsertUser(profile);
    const session = await createSessionForUser(user.googleId);

    applySessionCookie(response, session.token, session.expiresAt);

    return response.status(201).json({
      user,
      isNewUser,
      session: {
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    console.error('[SESSION_CREATE_ERROR]', error.message);
    return response
      .status(getGoogleAuthErrorStatus(error.message))
      .json({ error: error.message || 'Authentication failed.' });
  }
});

sessionRoutes.get('/current', async (request, response) => {
  try {
    const sessionToken = getSessionTokenFromRequest(request);
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      if (sessionToken) {
        clearSessionCookie(response);
      }

      return response.json({ user: null });
    }

    return response.json({ user });
  } catch (error) {
    console.error('[SESSION_CURRENT_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to resolve session.' });
  }
});

sessionRoutes.delete('/current', async (request, response) => {
  try {
    const sessionToken = getSessionTokenFromRequest(request);

    if (sessionToken) {
      await deleteSessionByToken(sessionToken);
    }

    clearSessionCookie(response);
    return response.status(204).send();
  } catch (error) {
    console.error('[SESSION_DELETE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to logout.' });
  }
});

export default sessionRoutes;
