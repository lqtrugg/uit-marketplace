import { getDataSource } from '../core/dataSource.js';
import { PostEntity } from '../entities/PostEntity.js';

function normalizePost(post) {
  return {
    id: post.id,
    authorGoogleId: post.authorGoogleId,
    authorName: post.authorName,
    authorEmail: post.authorEmail,
    content: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt
  };
}

export function sanitizePostContent(content) {
  const value = typeof content === 'string' ? content.trim() : '';

  if (!value) {
    return {
      content: '',
      error: 'Post content is required.'
    };
  }

  if (value.length > 2000) {
    return {
      content: '',
      error: 'Post content must be 2000 characters or fewer.'
    };
  }

  return {
    content: value,
    error: ''
  };
}

export async function createPost({ user, content }) {
  const dataSource = await getDataSource();
  const postRepo = dataSource.getRepository(PostEntity);

  const created = postRepo.create({
    authorGoogleId: user.googleId,
    authorName: user.name,
    authorEmail: user.email,
    content
  });

  const saved = await postRepo.save(created);
  return normalizePost(saved);
}

export async function deletePost({ postId, userGoogleId }) {
  const dataSource = await getDataSource();
  const postRepo = dataSource.getRepository(PostEntity);
  const existing = await postRepo.findOneBy({ id: postId });

  if (!existing) {
    return {
      deleted: false,
      reason: 'not_found'
    };
  }

  if (existing.authorGoogleId !== userGoogleId) {
    return {
      deleted: false,
      reason: 'forbidden'
    };
  }

  await postRepo.delete({ id: postId });

  return {
    deleted: true,
    reason: ''
  };
}
