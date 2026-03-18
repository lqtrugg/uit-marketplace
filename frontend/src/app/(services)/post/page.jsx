'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatTime, getErrorMessage, requestJson } from '@/app/_lib/clientApi';

export default function PostPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState({ tone: 'info', text: '' });
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState(0);

  const canPost = useMemo(() => Boolean(currentUser && draft.trim().length > 0 && !posting), [
    currentUser,
    draft,
    posting
  ]);

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      try {
        const [sessionPayload, feedPayload] = await Promise.all([
          requestJson('/api/auth/session'),
          requestJson('/api/feed?limit=10')
        ]);

        if (ignore) {
          return;
        }

        setCurrentUser(sessionPayload.user || null);
        setPosts(feedPayload.posts || []);
      } catch (error) {
        if (!ignore) {
          setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to load data.') });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      ignore = true;
    };
  }, []);

  async function refreshFeed() {
    try {
      const payload = await requestJson('/api/feed?limit=10');
      setPosts(payload.posts || []);
    } catch (error) {
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to refresh posts.') });
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault();

    if (!canPost) {
      return;
    }

    setPosting(true);
    setStatus({ tone: 'info', text: 'Posting...' });

    try {
      const payload = await requestJson('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: draft })
      });

      setDraft('');
      setPosts((previous) => [payload.post, ...previous]);
      setStatus({ tone: 'success', text: 'Post published.' });
    } catch (error) {
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to create post.') });
    } finally {
      setPosting(false);
    }
  }

  async function handleDeletePost(postId) {
    if (!postId || deletingPostId) {
      return;
    }

    setDeletingPostId(postId);

    try {
      await requestJson(`/api/posts/${postId}`, {
        method: 'DELETE',
        body: JSON.stringify({})
      });

      setPosts((previous) => previous.filter((post) => post.id !== postId));
      setStatus({ tone: 'success', text: 'Post deleted.' });
    } catch (error) {
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to delete post.') });
    } finally {
      setDeletingPostId(0);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h1>Post Service</h1>
        <button type="button" className="btn ghost" onClick={refreshFeed}>
          Refresh
        </button>
      </div>

      <p className="subtitle">
        Create posts as the authenticated user. You can delete only posts authored by your account.
      </p>

      <div className="hero-grid single-grid">
        <article>
          <span>Session state</span>
          <strong>{loading ? 'Loading...' : currentUser ? currentUser.email : 'Not authenticated'}</strong>
        </article>
      </div>

      <form className="post-form" onSubmit={handleCreatePost}>
        <label htmlFor="post-content">Write a post</label>
        <textarea
          id="post-content"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={currentUser ? 'Share something...' : 'Go to Auth page and login first'}
          maxLength={2000}
          rows={4}
          disabled={!currentUser || posting}
        />
        <div className="form-foot">
          <span>{draft.length}/2000</span>
          <button type="submit" className="btn primary" disabled={!canPost}>
            {posting ? 'Posting...' : 'Publish'}
          </button>
        </div>
      </form>

      <div className="panel-head compact-head">
        <h2>Recent posts</h2>
        <span className="count-pill">{posts.length}</span>
      </div>

      {posts.length === 0 ? (
        <p className="placeholder">No posts yet.</p>
      ) : (
        <ul className="feed-list">
          {posts.map((post) => {
            const isOwner = currentUser?.googleId === post.authorGoogleId;

            return (
              <li key={post.id}>
                <div>
                  <p className="post-content">{post.content}</p>
                  <p className="post-meta">
                    {post.authorName} ({post.authorEmail}) | {formatTime(post.createdAt)}
                  </p>
                </div>

                {isOwner ? (
                  <button
                    type="button"
                    className="btn danger"
                    disabled={deletingPostId === post.id}
                    onClick={() => handleDeletePost(post.id)}
                  >
                    {deletingPostId === post.id ? 'Deleting...' : 'Delete'}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {status.text ? <p className={`status status-${status.tone}`}>{status.text}</p> : null}
    </section>
  );
}
