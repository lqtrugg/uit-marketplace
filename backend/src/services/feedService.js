import { LessThan } from 'typeorm';
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

function parseLimit(rawLimit) {
  const parsed = Number.parseInt(rawLimit || '20', 10);

  if (Number.isNaN(parsed)) {
    return 20;
  }

  return Math.min(Math.max(parsed, 1), 100);
}

function parseBefore(rawBefore) {
  if (!rawBefore) {
    return null;
  }

  const value = new Date(rawBefore);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
}

export async function getFeed({ limit, before }) {
  const normalizedLimit = parseLimit(limit);
  const beforeDate = parseBefore(before);
  const dataSource = await getDataSource();
  const postRepo = dataSource.getRepository(PostEntity);

  const where = beforeDate
    ? {
        createdAt: LessThan(beforeDate)
      }
    : {};

  const rows = await postRepo.find({
    where,
    order: {
      createdAt: 'DESC'
    },
    take: normalizedLimit + 1
  });

  const hasMore = rows.length > normalizedLimit;
  const visible = hasMore ? rows.slice(0, normalizedLimit) : rows;
  const posts = visible.map(normalizePost);

  return {
    posts,
    nextCursor: hasMore && posts.length > 0 ? new Date(posts[posts.length - 1].createdAt).toISOString() : null
  };
}
