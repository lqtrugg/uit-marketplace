'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatTime, getErrorMessage, requestJson } from '@/app/_lib/clientApi';
import PageHero from '@/app/_components/ui/PageHero';

export default function PostPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState({ tone: 'info', text: '' });
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState(0);
  const draftLength = draft.length;
  const draftTrimmed = draft.trim();

  const canPost = useMemo(
    () => Boolean(currentUser && draftTrimmed.length > 0 && !posting),
    [currentUser, draftTrimmed, posting]
  );

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      try {
        const [sessionPayload, feedPayload] = await Promise.all([
          requestJson('/api/sessions/current'),
          requestJson('/api/posts?limit=10')
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
      const payload = await requestJson('/api/posts?limit=10');
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
      <PageHero
        iconSrc="/clicon/image/svg/mail.svg"
        title="Post Service"
        subtitle="Create a quick post, preview it, and manage your own timeline."
        actions={[
          { label: 'Refresh', onClick: refreshFeed },
          { label: 'Open Feed', href: '/feed', primary: true }
        ]}
      />

      <div className="hero-grid">
        <article>
          <span>Session</span>
          <strong>{loading ? 'Loading...' : currentUser ? currentUser.email : 'Not authenticated'}</strong>
        </article>
        <article>
          <span>Draft Status</span>
          <strong>{draftTrimmed ? `${draftLength} chars` : 'Start writing'}</strong>
        </article>
        <article>
          <span>Publish Rule</span>
          <strong>{currentUser ? 'Authenticated only' : 'Login required'}</strong>
        </article>
      </div>

      <form className="post-form post-editor-card" onSubmit={handleCreatePost}>
        <div className="post-editor-head">
          <label htmlFor="post-content">Write a post</label>
          {!currentUser ? (
            <Link href="/auth" className="btn secondary">
              Go To Auth
            </Link>
          ) : null}
        </div>
        <textarea
          id="post-content"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={currentUser ? 'Share something...' : 'Go to Auth page and login first'}
          maxLength={2000}
          rows={4}
          disabled={!currentUser || posting}
        />
        {draftTrimmed ? (
          <div className="post-preview">
            <p className="post-preview-title">Preview</p>
            <p className="post-content">{draftTrimmed}</p>
          </div>
        ) : (
          <p className="post-empty-hint">Tip: keep post short and clear so buyers can scan quickly.</p>
        )}
        <div className="form-foot">
          <span>{draftLength}/2000</span>
          <div className="inline-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setDraft('')}
              disabled={posting || draftLength === 0}
            >
              Clear
            </button>
            <button type="submit" className="btn primary" disabled={!canPost}>
              {posting ? 'Posting...' : 'Publish'}
            </button>
          </div>
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
            const badge =
              (post.authorName || post.authorEmail || '?')
                .trim()
                .slice(0, 1)
                .toUpperCase() || '?';

            return (
              <li key={post.id} className="post-row">
                <div className="post-owner-badge">{badge}</div>
                <div className="post-body">
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
