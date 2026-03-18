import { Router } from 'express';
import { requireAuthenticatedUser } from '../services/authService.js';
import { createPost, deletePost, sanitizePostContent } from '../services/postService.js';

const postRoutes = Router();

postRoutes.post('/', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const { content, error } = sanitizePostContent(request.body?.content);

    if (error) {
      return response.status(400).json({ error });
    }

    const post = await createPost({ user, content });

    return response.status(201).json({ post });
  } catch (error) {
    console.error('[POST_CREATE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to create post.' });
  }
});

postRoutes.delete('/:id', async (request, response) => {
  try {
    const postId = Number.parseInt(request.params?.id || '', 10);

    if (Number.isNaN(postId) || postId <= 0) {
      return response.status(400).json({ error: 'Invalid post id.' });
    }

    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const result = await deletePost({ postId, userGoogleId: user.googleId });

    if (!result.deleted && result.reason === 'not_found') {
      return response.status(404).json({ error: 'Post not found.' });
    }

    if (!result.deleted && result.reason === 'forbidden') {
      return response.status(403).json({ error: 'You can only delete your own posts.' });
    }

    return response.json({ ok: true });
  } catch (error) {
    console.error('[POST_DELETE_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to delete post.' });
  }
});

export default postRoutes;
