'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'U';
}

export default function UserProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState('');
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const targetGoogleId = String(params?.googleId || '').trim();

        if (!targetGoogleId) {
          throw new Error('Invalid profile id.');
        }

        const sessionPayload = await requestJson('/api/sessions/current');
        const me = sessionPayload.user || null;

        if (!me) {
          clearStoredAuthToken();
          router.replace('/');
          return;
        }

        const payload = await requestJson(`/api/users/${encodeURIComponent(targetGoogleId)}`);

        if (!ignore) {
          setCurrentUser(me);
          setProfile(payload || null);
        }
      } catch (error) {
        if (!ignore) {
          setStatus(getErrorMessage(error, 'Failed to load user profile.'));
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
  }, [params?.googleId, router]);

  if (checking) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-clicon-border bg-white p-6 text-sm text-clicon-muted">
          Loading user profile...
        </div>
      </section>
    );
  }

  if (status || !profile?.user) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {status || 'User not found.'}
        </div>
      </section>
    );
  }

  const isMe = currentUser?.googleId && currentUser.googleId === profile.user.googleId;
  const listingCount = Number(profile?.activity?.listingCount || profile?.activity?.postCount || 0);
  const lastListingAt = profile?.activity?.lastListingAt || profile?.activity?.lastPostAt || null;

  return (
    <section className="app-container py-8 sm:py-10">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-clicon-border bg-white p-6 shadow-card">
        <PageHero
          iconSrc="/clicon/image/svg/user.svg"
          title="User Profile"
          subtitle="Public member information."
          actions={[{ href: '/social-profile', label: 'Back' }]}
        />

        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-clicon-surface p-4">
          {profile.user.picture ? (
            <img src={profile.user.picture} alt={profile.user.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="grid h-16 w-16 place-content-center rounded-full bg-clicon-darkBlue text-lg font-bold text-white">
              {getInitials(profile.user.name)}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-clicon-slate">{profile.user.name}</h2>
            <p className="truncate text-sm text-clicon-muted">{profile.user.email}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-clicon-border p-4">
            <p className="text-xs uppercase tracking-wide text-clicon-muted">Listings</p>
            <p className="mt-1 text-2xl font-bold text-clicon-slate">{listingCount}</p>
          </div>
          <div className="rounded-xl border border-clicon-border p-4">
            <p className="text-xs uppercase tracking-wide text-clicon-muted">Last Listing</p>
            <p className="mt-1 text-sm font-semibold text-clicon-slate">
              {lastListingAt ? formatTime(lastListingAt) : 'No listing yet'}
            </p>
          </div>
        </div>

        {!isMe ? (
          <div className="mt-6">
            <Link
              href={`/chat/${encodeURIComponent(profile.user.googleId)}`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-clicon-primary px-5 text-sm font-semibold text-white transition hover:bg-clicon-secondary"
            >
              Chat
            </Link>
          </div>
        ) : null}
      </article>
    </section>
  );
}
