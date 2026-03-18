import { Router } from 'express';
import {
  applySessionCookie,
  clearSessionCookie,
  createSessionForUser,
  deleteSessionByToken,
  getSessionTokenFromRequest,
  getUserFromSessionToken,
  upsertUser,
  verifyGoogleCredential
} from '../services/authService.js';

const authRoutes = Router();

authRoutes.post('/google', async (request, response) => {
  try {
    const credential = request.body?.credential;
    const profile = await verifyGoogleCredential(credential);
    const { user, isNewUser } = await upsertUser(profile);
    const { token, expiresAt } = await createSessionForUser(user.googleId);

    applySessionCookie(response, token, expiresAt);

    return response.json({
      user,
      isNewUser,
      session: {
        expiresAt
      }
    });
  } catch (error) {
    console.error('[AUTH_GOOGLE_ERROR]', error.message);

    const status =
      error.message === 'Only @gm.uit.edu.vn accounts are allowed.' ||
      error.message === 'Google email is not verified.'
        ? 403
        : error.message === 'Missing Google credential token.' ||
            error.message === 'Invalid Google token payload.'
          ? 400
          : error.message === 'Google token verification failed.'
            ? 401
            : 500;

    return response.status(status).json({ error: error.message || 'Authentication failed.' });
  }
});

authRoutes.get('/session', async (request, response) => {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return response.json({ user: null });
    }

    const user = await getUserFromSessionToken(token);

    if (!user) {
      clearSessionCookie(response);
      return response.json({ user: null });
    }

    return response.json({ user });
  } catch (error) {
    console.error('[AUTH_SESSION_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to resolve session.' });
  }
});

authRoutes.post('/logout', async (request, response) => {
  try {
    const token = getSessionTokenFromRequest(request);

    if (token) {
      await deleteSessionByToken(token);
    }

    clearSessionCookie(response);
    return response.json({ ok: true });
  } catch (error) {
    console.error('[AUTH_LOGOUT_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to logout.' });
  }
});

export default authRoutes;
