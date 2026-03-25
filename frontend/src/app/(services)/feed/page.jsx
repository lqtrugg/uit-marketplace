'use client';

import { useEffect, useState } from 'react';
import { formatTime, getErrorMessage, requestJson } from '@/app/_lib/clientApi';
import PageHero from '@/app/_components/ui/PageHero';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState('');
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [status, setStatus] = useState({ tone: 'info', text: '' });

  useEffect(() => {
    let ignore = false;

    async function loadFeed() {
      try {
        const payload = await requestJson('/api/posts?limit=10');

        if (!ignore) {
          setPosts(payload.posts || []);
          setNextCursor(payload.nextCursor || '');
        }
      } catch (error) {
        if (!ignore) {
          setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to load feed.') });
        }
      } finally {
        if (!ignore) {
          setLoadingFeed(false);
        }
      }
    }

    loadFeed();

    return () => {
      ignore = true;
    };
  }, []);

  async function refreshFeed() {
    setLoadingFeed(true);

    try {
      const payload = await requestJson('/api/posts?limit=10');
      setPosts(payload.posts || []);
      setNextCursor(payload.nextCursor || '');
    } catch (error) {
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to refresh feed.') });
    } finally {
      setLoadingFeed(false);
    }
  }

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const query = new URLSearchParams({
        limit: '10',
        before: nextCursor
      });

      const payload = await requestJson(`/api/posts?${query.toString()}`);

      setPosts((previous) => [...previous, ...(payload.posts || [])]);
      setNextCursor(payload.nextCursor || '');
    } catch (error) {
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to load more posts.') });
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="panel">
      <PageHero
        iconSrc="/clicon/image/svg/calendar.svg"
        title="Feed Service"
        subtitle="Public timeline of posts, ordered newest first."
        actions={[
          {
            label: loadingFeed ? 'Refreshing...' : 'Refresh',
            onClick: refreshFeed
          }
        ]}
      />

      <div className="panel-head compact-head">
        <h2>Posts</h2>
        <span className="count-pill">{posts.length}</span>
      </div>

      {loadingFeed ? (
        <p className="placeholder">Loading feed...</p>
      ) : posts.length === 0 ? (
        <p className="placeholder">No posts yet.</p>
      ) : (
        <ul className="feed-list">
          {posts.map((post) => {
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
              </li>
            );
          })}
        </ul>
      )}

      <div className="feed-foot">
        {nextCursor ? (
          <button type="button" className="btn secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        ) : (
          <span className="placeholder">No more posts.</span>
        )}
      </div>

      {status.text ? <p className={`status status-${status.tone}`}>{status.text}</p> : null}
    </section>
  );
}
