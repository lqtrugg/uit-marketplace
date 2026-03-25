'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearStoredAuthToken,
  getErrorMessage,
  requestJson
} from '@/app/_lib/clientApi';
import PageHero from '@/app/_components/ui/PageHero';

export default function ReservedItemsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let ignore = false;

    async function guardRoute() {
      try {
        const payload = await requestJson('/api/sessions/current');

        if (ignore) {
          return;
        }

        if (!payload.user) {
          clearStoredAuthToken();
          router.replace('/');
          return;
        }
      } catch (error) {
        if (!ignore) {
          clearStoredAuthToken();
          setStatus(getErrorMessage(error, 'Failed to validate authentication.'));
          router.replace('/');
        }
      } finally {
        if (!ignore) {
          setChecking(false);
        }
      }
    }

    guardRoute();

    return () => {
      ignore = true;
    };
  }, [router]);

  if (checking) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-clicon-border bg-white p-6 text-sm text-clicon-muted">
          Validating JWT session...
        </div>
      </section>
    );
  }

  return (
    <section className="app-container py-8 sm:py-10">
      <article className="rounded-2xl border border-clicon-border bg-white p-5 shadow-card sm:p-6">
        <PageHero
          iconSrc="/clicon/image/svg/clock.svg"
          title="Workflow Update"
          subtitle="Payment flow is removed. Use offer workflow for negotiations."
          actions={[{ label: 'Open Offers', href: '/offers' }]}
        />

        {status ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{status}</div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/home"
              className="inline-flex items-center gap-2 rounded-xl border border-clicon-border px-3 py-2 text-sm font-semibold text-clicon-darkBlue transition hover:bg-clicon-surface"
            >
              <img src="/clicon/image/svg/portfolio.svg" alt="" className="size-4" />
              Browse Items
            </Link>
            <Link
              href="/settings/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-clicon-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-clicon-secondary"
            >
              <img src="/clicon/image/svg/calendar.svg" alt="" className="size-4" />
              Open Seller Dashboard
            </Link>
          </div>
        )}
      </article>
    </section>
  );
}
