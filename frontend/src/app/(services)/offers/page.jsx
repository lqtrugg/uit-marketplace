'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearStoredAuthToken,
  formatTime,
  getErrorMessage,
  listMyOffers,
  requestJson
} from '@/app/_lib/clientApi';
import PageHero from '@/app/_components/ui/PageHero';

function formatVndCurrency(value) {
  const amount = Number.parseInt(String(value || ''), 10);

  if (!Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
    return 'N/A';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

function getStatusTone(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'accepted') {
    return 'bg-green-50 text-green-700';
  }
  if (normalized === 'rejected' || normalized === 'cancelled' || normalized === 'expired') {
    return 'bg-red-50 text-red-700';
  }
  return 'bg-amber-50 text-amber-700';
}

export default function MyOffersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState('');
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

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

  useEffect(() => {
    if (checking) {
      return;
    }

    let ignore = false;

    async function loadOffers() {
      setLoadingOffers(true);
      setStatus('');

      try {
        const rows = await listMyOffers({ limit: 500 });

        if (!ignore) {
          setOffers(rows);
        }
      } catch (error) {
        if (!ignore) {
          setOffers([]);
          setStatus(getErrorMessage(error, 'Failed to load your offers.'));
        }
      } finally {
        if (!ignore) {
          setLoadingOffers(false);
        }
      }
    }

    loadOffers();

    return () => {
      ignore = true;
    };
  }, [checking]);

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
          iconSrc="/clicon/image/svg/mail.svg"
          title="My Offers"
          subtitle="All offers that you made to sellers."
          pill={`Total ${offers.length}`}
          actions={[{ label: 'Browse Items', href: '/home' }]}
        />

        {status ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{status}</div>
        ) : loadingOffers ? (
          <div className="mt-6 rounded-xl border border-clicon-border bg-clicon-surface p-5 text-sm text-clicon-muted">
            Loading offers...
          </div>
        ) : offers.length === 0 ? (
          <div className="mt-6 rounded-xl border border-clicon-border bg-clicon-surface p-5 text-sm text-clicon-muted">
            You have not made any offer yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => {
              const item = offer.item || null;
              const imageUrl =
                item && Array.isArray(item.imageUrls) && item.imageUrls.length ? item.imageUrls[0] : '';

              return (
                <article
                  key={offer.id}
                  className="rounded-xl border border-clicon-border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div className="mb-3 overflow-hidden rounded-lg border border-clicon-border bg-clicon-surface">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item?.itemName || `Item #${offer.itemId}`} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="grid h-40 place-content-center text-xs text-clicon-muted">No image</div>
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm font-semibold text-clicon-slate">
                    {item?.itemName || `Item #${offer.itemId}`}
                  </p>

                  <div className="mt-3 space-y-1 text-xs text-clicon-muted">
                    <p>
                      <img src="/clicon/image/svg/portfolio.svg" alt="" className="mr-1 inline-block size-3.5 align-text-bottom" />
                      <span className="font-semibold text-clicon-slate">Listed Price:</span> {item?.price || 'N/A'}
                    </p>
                    <p>
                      <img src="/clicon/image/svg/calendar.svg" alt="" className="mr-1 inline-block size-3.5 align-text-bottom" />
                      <span className="font-semibold text-clicon-slate">My Offer:</span>{' '}
                      {formatVndCurrency(offer.offeredPrice)}
                    </p>
                    <p>
                      <img src="/clicon/image/svg/user.svg" alt="" className="mr-1 inline-block size-3.5 align-text-bottom" />
                      <span className="font-semibold text-clicon-slate">Seller:</span> {offer.sellerGoogleId}
                    </p>
                    <p>
                      <img src="/clicon/image/svg/clock.svg" alt="" className="mr-1 inline-block size-3.5 align-text-bottom" />
                      <span className="font-semibold text-clicon-slate">Created:</span> {formatTime(offer.createdAt)}
                    </p>
                  </div>

                  {offer.message ? (
                    <p className="mt-2 rounded-lg bg-clicon-surface p-2 text-xs text-clicon-muted">
                      {offer.message}
                    </p>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusTone(
                        offer.status
                      )}`}
                    >
                      {offer.status}
                    </span>
                    <Link
                      href={`/items/${offer.itemId}`}
                      className="text-xs font-semibold text-clicon-primary transition hover:text-clicon-secondary"
                    >
                      View Item
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
