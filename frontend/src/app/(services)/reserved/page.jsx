'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearStoredAuthToken,
  formatTime,
  getErrorMessage,
  listMyDummyDeposits,
  requestJson
} from '@/app/_lib/clientApi';

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

export default function ReservedItemsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState('');
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [deposits, setDeposits] = useState([]);

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

    async function loadReservedDeposits() {
      setLoadingDeposits(true);
      setStatus('');

      try {
        const rows = await listMyDummyDeposits({ limit: 200 });

        if (!ignore) {
          setDeposits(rows);
        }
      } catch (error) {
        if (!ignore) {
          setDeposits([]);
          setStatus(getErrorMessage(error, 'Failed to load reserved items.'));
        }
      } finally {
        if (!ignore) {
          setLoadingDeposits(false);
        }
      }
    }

    loadReservedDeposits();

    return () => {
      ignore = true;
    };
  }, [checking]);

  const confirmedCount = useMemo(
    () => deposits.filter((deposit) => deposit?.status === 'confirmed').length,
    [deposits]
  );

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
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-clicon-border pb-4">
          <div>
            <h1 className="text-3xl font-bold text-clicon-slate">Reserved Items</h1>
            <p className="mt-1 text-sm text-clicon-muted">
              All items where you placed a dummy deposit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-clicon-surface px-3 py-1 text-clicon-slate">
              Total: {deposits.length}
            </span>
            <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
              Confirmed: {confirmedCount}
            </span>
          </div>
        </div>

        {status ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{status}</div>
        ) : loadingDeposits ? (
          <div className="mt-6 rounded-xl border border-clicon-border bg-clicon-surface p-5 text-sm text-clicon-muted">
            Loading reserved items...
          </div>
        ) : deposits.length === 0 ? (
          <div className="mt-6 rounded-xl border border-clicon-border bg-clicon-surface p-5 text-sm text-clicon-muted">
            No reserved items yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {deposits.map((deposit) => {
              const item = deposit.item || null;
              const imageUrl =
                item && Array.isArray(item.imageUrls) && item.imageUrls.length ? item.imageUrls[0] : '';
              const itemLabel = item?.itemName || `Item #${deposit.itemId}`;
              const isConfirmed = deposit.status === 'confirmed';

              return (
                <article
                  key={deposit.referenceId}
                  className="rounded-xl border border-clicon-border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div className="mb-3 overflow-hidden rounded-lg border border-clicon-border bg-clicon-surface">
                    {imageUrl ? (
                      <img src={imageUrl} alt={itemLabel} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="grid h-40 place-content-center text-xs text-clicon-muted">No image</div>
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm font-semibold text-clicon-slate">{itemLabel}</p>
                  <p className="mt-1 text-xs text-clicon-muted">Seller: {item?.sellerName || 'Unknown seller'}</p>

                  <div className="mt-3 space-y-1 text-xs text-clicon-muted">
                    <p>
                      <span className="font-semibold text-clicon-slate">Ref:</span> {deposit.referenceId}
                    </p>
                    <p>
                      <span className="font-semibold text-clicon-slate">Deposit:</span>{' '}
                      {formatVndCurrency(deposit.amount)}
                    </p>
                    <p>
                      <span className="font-semibold text-clicon-slate">Item Price:</span>{' '}
                      {item?.price || 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold text-clicon-slate">Confirmed At:</span>{' '}
                      {deposit.confirmedAt ? formatTime(deposit.confirmedAt) : 'Not confirmed'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        isConfirmed
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {deposit.status}
                    </span>
                    <Link
                      href={`/items/${deposit.itemId}`}
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
