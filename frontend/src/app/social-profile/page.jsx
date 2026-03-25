'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearStoredAuthToken,
  formatTime,
  getErrorMessage,
  requestJson
} from '@/app/_lib/clientApi';
import PageHero from '@/app/_components/ui/PageHero';

function getInitials(name) {
  if (!name) {
    return 'U';
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((part) => part[0]?.toUpperCase() || '').join('');

  return initials || 'U';
}

export default function SocialProfilePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState('');
  const [profile, setProfile] = useState(null);
  const [topUsers, setTopUsers] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const sessionPayload = await requestJson('/api/sessions/current');
        const currentUser = sessionPayload.user || null;

        if (!currentUser) {
          clearStoredAuthToken();
          router.replace('/');
          return;
        }

        const [profileResult, topUsersResult] = await Promise.allSettled([
          requestJson(`/api/users/${encodeURIComponent(currentUser.googleId)}`),
          requestJson('/api/users/top?limit=6')
        ]);

        if (ignore) {
          return;
        }

        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value);
        } else {
          setProfile({
            user: currentUser,
            activity: {
              postCount: 0,
              lastPostAt: null
            }
          });
        }

        if (topUsersResult.status === 'fulfilled') {
          setTopUsers(topUsersResult.value.users || []);
        }
      } catch (error) {
        if (!ignore) {
          clearStoredAuthToken();
          setStatus(getErrorMessage(error, 'Failed to load social profile.'));
          router.replace('/');
        }
      } finally {
        if (!ignore) {
          setChecking(false);
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [router]);

  if (checking) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-clicon-border bg-white p-6 text-sm text-clicon-muted">
          Loading social profile...
        </div>
      </section>
    );
  }

  if (status) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{status}</div>
      </section>
    );
  }

  if (!profile) {
    return null;
  }

  const myListingCount = Number(profile?.activity?.listingCount || profile?.activity?.postCount || 0);
  const myLastListingAt = profile?.activity?.lastListingAt || profile?.activity?.lastPostAt || null;

  return (
    <section className="app-container py-8 sm:py-10">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <article className="rounded-2xl border border-clicon-border bg-white p-6 shadow-card">
          <PageHero
            iconSrc="/clicon/image/svg/user.svg"
            title="Social Profile"
            subtitle="Your public profile and activity summary."
          />

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-clicon-surface p-4">
            {profile.user.picture ? (
              <img
                src={profile.user.picture}
                alt={profile.user.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 place-content-center rounded-full bg-clicon-darkBlue text-lg font-bold text-white">
                {getInitials(profile.user.name)}
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold text-clicon-slate">{profile.user.name}</h2>
              <p className="text-sm text-clicon-muted">{profile.user.email}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Posts</p>
              <p className="mt-1 text-2xl font-bold text-clicon-slate">{myListingCount}</p>
            </div>
            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Last Post</p>
              <p className="mt-1 text-sm font-semibold text-clicon-slate">
                {myLastListingAt ? formatTime(myLastListingAt) : 'No posts yet'}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-clicon-border bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold text-clicon-slate">Top Active Users</h2>
          <p className="mt-1 text-sm text-clicon-muted">Recent active members in the community.</p>

          <div className="mt-4 space-y-3">
            {topUsers.length === 0 ? (
              <p className="rounded-xl bg-clicon-surface p-3 text-sm text-clicon-muted">
                No ranking data available.
              </p>
            ) : (
              topUsers.map((user, index) => (
                <div key={user.googleId} className="flex items-center justify-between rounded-xl border border-clicon-border p-3">
                  {(() => {
                    const isCurrentUser = profile?.user?.googleId && profile.user.googleId === user.googleId;
                    return (
                      <>
                        <div>
                          <p className="text-sm font-semibold text-clicon-slate">
                            #{index + 1} {user.name}
                          </p>
                          <p className="text-xs text-clicon-muted">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-clicon-secondary">
                            {user.listingCount || user.postCount || 0} posts
                          </p>
                          <Link
                            href={`/social-profile/${encodeURIComponent(user.googleId)}`}
                            className="inline-flex rounded-lg border border-clicon-border px-2.5 py-1.5 text-xs font-semibold text-clicon-darkBlue transition hover:bg-clicon-surface"
                          >
                            Profile
                          </Link>
                          {isCurrentUser ? null : (
                            <Link
                              href={`/chat/${encodeURIComponent(user.googleId)}`}
                              className="inline-flex rounded-lg bg-clicon-primary px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-clicon-secondary"
                            >
                              Chat
                            </Link>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
