import { Router } from 'express';
import { requireAuthenticatedUser } from '../services/authService.js';
import {
  getTopActiveUsers,
  getUserProfileByGoogleId,
  updateAuthenticatedUserProfile
} from '../services/userService.js';

const userRoutes = Router();

async function handleUserProfileByGoogleId(request, response) {
  try {
    const profile = await getUserProfileByGoogleId(request.params?.googleId || '');

    if (!profile) {
      return response.status(404).json({ error: 'User not found.' });
    }

    return response.json(profile);
  } catch (error) {
    console.error('[USER_PROFILE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load user profile.' });
  }
}

userRoutes.get('/me', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const profile = await getUserProfileByGoogleId(user.googleId);

    if (!profile) {
      return response.status(404).json({ error: 'User not found.' });
    }

    return response.json(profile);
  } catch (error) {
    console.error('[USER_ME_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load your profile.' });
  }
});

userRoutes.put('/me', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const updatedUser = await updateAuthenticatedUserProfile({
      googleId: user.googleId,
      name: request.body?.name,
      picture: request.body?.picture
    });

    return response.json({ user: updatedUser });
  } catch (error) {
    console.error('[USER_UPDATE_ME_ERROR]', error.message);

    if (
      error.message === 'Display name must be a string.' ||
      error.message === 'Display name must be between 2 and 80 characters.' ||
      error.message === 'Picture URL must be a string.' ||
      error.message === 'Picture URL is too long.' ||
      error.message === 'Picture URL must start with http://, https:// or /.'
    ) {
      return response.status(400).json({ error: error.message });
    }

    if (error.message === 'User not found.') {
      return response.status(404).json({ error: error.message });
    }

    return response.status(500).json({ error: 'Failed to update profile.' });
  }
});

userRoutes.get('/top', async (request, response) => {
  try {
    const users = await getTopActiveUsers(request.query?.limit);
    return response.json({ users });
  } catch (error) {
    console.error('[USERS_TOP_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load top users.' });
  }
});

userRoutes.get('/:googleId/profile', handleUserProfileByGoogleId);
userRoutes.get('/:googleId', handleUserProfileByGoogleId);

export default userRoutes;
