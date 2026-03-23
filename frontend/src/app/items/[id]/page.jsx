'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  clearStoredAuthToken,
  confirmDummyDepositByReference,
  formatTime,
  getItemDetail,
  getErrorMessage,
  getSimilarItems,
  listMyFavoriteItems,
  markItemSold,
  requestDummyDepositSession,
  requestJson,
  reserveItem,
  setItemFavorite,
  unreserveItem,
  updateItemStatus
} from '@/app/_lib/clientApi';

function toReadableDuration(item) {
  const days = Number.isInteger(item?.durationDays) ? item.durationDays : 0;
  const hours = Number.isInteger(item?.durationHours) ? item.durationHours : 0;
  return `${days} day(s) ${hours} hour(s)`;
}

function parseDummyDepositAmount(rawPrice) {
  const digitsOnly = String(rawPrice || '')
    .replace(/[^\d]/g, '')
    .trim();
  const parsed = Number.parseInt(digitsOnly, 10);

  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
    return 50000;
  }

  return Math.min(Math.max(parsed, 10000), 5_000_000);
}

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

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [item, setItem] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [similarItems, setSimilarItems] = useState([]);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositConfirming, setDepositConfirming] = useState(false);
  const [depositSession, setDepositSession] = useState(null);
  const [depositError, setDepositError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadItem() {
      try {
        const sessionPayload = await requestJson('/api/sessions/current');

        if (!sessionPayload.user) {
          clearStoredAuthToken();
          router.replace('/');
          return;
        }

        if (!ignore) {
          setCurrentUser(sessionPayload.user);
        }

        const itemId = Number.parseInt(String(params?.id || ''), 10);

        if (!itemId || Number.isNaN(itemId)) {
          throw new Error('Invalid item id.');
        }

        const [loadedItem, favoriteItems] = await Promise.all([
          getItemDetail(itemId),
          listMyFavoriteItems(200).catch(() => [])
        ]);

        if (!ignore) {
          setItem(loadedItem || null);
          setIsFavorited(favoriteItems.some((favorite) => favorite.id === itemId));
        }
      } catch (error) {
        if (!ignore) {
          setStatus(getErrorMessage(error, 'Failed to load item details.'));
        }
      } finally {
        if (!ignore) {
          setChecking(false);
        }
      }
    }

    loadItem();

    return () => {
      ignore = true;
    };
  }, [params?.id, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadSimilarItems() {
      if (!item?.id) {
        setSimilarItems([]);
        return;
      }

      try {
        const rows = await getSimilarItems(item.id, 8);

        if (!cancelled) {
          setSimilarItems(rows);
        }
      } catch {
        if (!cancelled) {
          setSimilarItems([]);
        }
      }
    }

    loadSimilarItems();

    return () => {
      cancelled = true;
    };
  }, [item?.id]);

  async function runItemAction(callback, successMessage) {
    if (!item?.id || actionLoading) {
      return;
    }

    setActionLoading(true);
    setActionStatus('');

    try {
      const updatedItem = await callback();

      if (updatedItem?.id) {
        setItem(updatedItem);
      }

      setActionStatus(successMessage);
    } catch (error) {
      setActionStatus(getErrorMessage(error, 'Failed to update item.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleFavorite() {
    if (!item?.id || actionLoading) {
      return;
    }

    setActionLoading(true);
    setActionStatus('');

    try {
      const nextValue = await setItemFavorite(item.id, !isFavorited);
      setIsFavorited(nextValue);
      setActionStatus(nextValue ? 'Added to favorites.' : 'Removed from favorites.');
    } catch (error) {
      setActionStatus(getErrorMessage(error, 'Failed to update favorite.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOpenDepositModal() {
    if (!item?.id || depositLoading) {
      return;
    }

    setIsDepositModalOpen(true);
    setDepositLoading(true);
    setDepositError('');
    setDepositSession(null);

    try {
      const session = await requestDummyDepositSession({
        itemId: item.id,
        amount: parseDummyDepositAmount(item.price)
      });
      setDepositSession(session);
    } catch (error) {
      setDepositError(getErrorMessage(error, 'Failed to create dummy deposit session.'));
    } finally {
      setDepositLoading(false);
    }
  }

  function handleCloseDepositModal() {
    if (depositLoading || depositConfirming) {
      return;
    }

    setIsDepositModalOpen(false);
  }

  async function handleDepositNext() {
    if (!depositSession || depositLoading || depositConfirming) {
      return;
    }

    setDepositConfirming(true);
    setDepositError('');

    try {
      const confirmed = await confirmDummyDepositByReference(depositSession.referenceId);
      const reference = encodeURIComponent(confirmed.referenceId);
      const itemId = Number.parseInt(String(confirmed.itemId || item.id || ''), 10);
      const itemQuery = Number.isInteger(itemId) && itemId > 0 ? `&itemId=${itemId}` : '';

      setIsDepositModalOpen(false);
      router.push(`/payment/success?referenceId=${reference}${itemQuery}`);
    } catch (error) {
      setDepositError(getErrorMessage(error, 'Failed to confirm dummy deposit.'));
    } finally {
      setDepositConfirming(false);
    }
  }

  if (checking) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-clicon-border bg-white p-6 text-sm text-clicon-muted">
          Loading item details...
        </div>
      </section>
    );
  }

  if (status || !item) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {status || 'Item not found.'}
        </div>
      </section>
    );
  }

  const isSeller = Boolean(currentUser?.googleId) && currentUser.googleId === item.sellerGoogleId;
  const isReservedByCurrentUser =
    Boolean(currentUser?.googleId) && currentUser.googleId === item.reservedByGoogleId;
  const canReserve = !isSeller && item.listingStatus === 'active';
  const canUnreserve = item.listingStatus === 'reserved' && (isSeller || isReservedByCurrentUser);
  const canMarkSold = isSeller && item.listingStatus !== 'sold';
  const canReopen = isSeller && (item.listingStatus === 'reserved' || item.listingStatus === 'hidden');
  const canHide = isSeller && item.listingStatus === 'active';

  return (
    <section className="app-container py-8 sm:py-10">
      <article className="rounded-2xl border border-clicon-border bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-clicon-border pb-4">
          <div>
            <h1 className="text-3xl font-bold text-clicon-slate">{item.itemName}</h1>
            <p className="mt-1 text-sm text-clicon-muted">
              Posted by {item.sellerName} ({item.sellerEmail})
            </p>
          </div>
          <Link
            href="/home"
            className="inline-flex rounded-lg border border-clicon-border px-3 py-2 text-sm font-semibold text-clicon-darkBlue transition hover:bg-clicon-surface"
          >
            Back to Listing
          </Link>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className="rounded-xl border border-clicon-border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-clicon-slate">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-clicon-muted">{item.description}</p>
            </section>

            <section className="rounded-xl border border-clicon-border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-clicon-slate">Reason for Selling</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-clicon-muted">{item.reasonForSelling}</p>
            </section>

            <section className="rounded-xl border border-clicon-border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-clicon-slate">Photos</h2>
              {Array.isArray(item.imageUrls) && item.imageUrls.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {item.imageUrls.map((imageUrl) => (
                    <a
                      key={imageUrl}
                      href={imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border border-clicon-border bg-clicon-surface"
                    >
                      <img src={imageUrl} alt={item.itemName} className="h-40 w-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-clicon-muted">No photos provided.</p>
              )}
            </section>

            <section className="rounded-xl border border-clicon-border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-clicon-slate">Videos</h2>
              {Array.isArray(item.videoUrls) && item.videoUrls.length ? (
                <div className="mt-3 grid gap-3">
                  {item.videoUrls.map((videoUrl) => (
                    <a
                      key={videoUrl}
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border border-clicon-border bg-clicon-surface"
                    >
                      <video
                        controls
                        preload="metadata"
                        className="h-64 w-full bg-black object-contain"
                        src={videoUrl}
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-clicon-muted">No videos provided.</p>
              )}
            </section>
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Price</p>
              <p className="mt-1 text-2xl font-bold text-clicon-secondary">{item.price}</p>
            </div>

            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Dummy Payment Service</p>
              <p className="mt-1 text-sm text-clicon-muted">
                Generate a temporary dummy QR for deposit simulation.
              </p>
              <button
                type="button"
                onClick={handleOpenDepositModal}
                disabled={depositLoading || depositConfirming}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-clicon-primary px-4 text-sm font-semibold text-white transition hover:bg-clicon-secondary disabled:opacity-60"
              >
                {depositLoading ? 'Preparing QR...' : depositConfirming ? 'Confirming...' : 'Place Deposit'}
              </button>
            </div>

            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Availability</p>
              <p className="mt-1 text-sm font-semibold text-clicon-slate">{toReadableDuration(item)}</p>
            </div>

            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Location</p>
              <p className="mt-1 text-sm font-semibold text-clicon-slate">{item.location}</p>
              <p className="mt-1 text-xs text-clicon-muted">Zip: {item.zipCode || 'N/A'}</p>
            </div>

            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Negotiable</p>
              <p className="mt-1 text-sm font-semibold text-clicon-slate">{item.negotiable}</p>
            </div>

            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Condition</p>
              <p className="mt-1 text-sm font-semibold text-clicon-slate">{item.conditionLabel}</p>
            </div>

            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Delivery</p>
              <p className="mt-1 text-sm font-semibold text-clicon-slate">{item.delivery || 'Not specified'}</p>
            </div>

            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Listing Status</p>
              <p className="mt-1 text-sm font-semibold capitalize text-clicon-slate">
                {item.listingStatus || 'active'}
              </p>
              {item.reservedAt ? (
                <p className="mt-1 text-xs text-clicon-muted">Reserved at: {formatTime(item.reservedAt)}</p>
              ) : null}
              {item.soldAt ? (
                <p className="mt-1 text-xs text-clicon-muted">Sold at: {formatTime(item.soldAt)}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  disabled={actionLoading}
                  className="inline-flex rounded-lg border border-clicon-border px-3 py-1.5 text-xs font-semibold text-clicon-darkBlue transition hover:bg-clicon-surface disabled:opacity-60"
                >
                  {isFavorited ? 'Unfavorite' : 'Favorite'}
                </button>
                {canReserve ? (
                  <button
                    type="button"
                    onClick={() => runItemAction(() => reserveItem(item.id), 'Item reserved successfully.')}
                    disabled={actionLoading}
                    className="inline-flex rounded-lg bg-clicon-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-clicon-secondary disabled:opacity-60"
                  >
                    Reserve
                  </button>
                ) : null}
                {canUnreserve ? (
                  <button
                    type="button"
                    onClick={() => runItemAction(() => unreserveItem(item.id), 'Reservation removed.')}
                    disabled={actionLoading}
                    className="inline-flex rounded-lg border border-clicon-border px-3 py-1.5 text-xs font-semibold text-clicon-darkBlue transition hover:bg-clicon-surface disabled:opacity-60"
                  >
                    Unreserve
                  </button>
                ) : null}
                {canMarkSold ? (
                  <button
                    type="button"
                    onClick={() => runItemAction(() => markItemSold(item.id), 'Item marked as sold.')}
                    disabled={actionLoading}
                    className="inline-flex rounded-lg bg-clicon-secondary px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                  >
                    Mark Sold
                  </button>
                ) : null}
                {canReopen ? (
                  <button
                    type="button"
                    onClick={() =>
                      runItemAction(() => updateItemStatus(item.id, 'active'), 'Listing reopened as active.')
                    }
                    disabled={actionLoading}
                    className="inline-flex rounded-lg border border-clicon-border px-3 py-1.5 text-xs font-semibold text-clicon-darkBlue transition hover:bg-clicon-surface disabled:opacity-60"
                  >
                    Reopen
                  </button>
                ) : null}
                {canHide ? (
                  <button
                    type="button"
                    onClick={() =>
                      runItemAction(() => updateItemStatus(item.id, 'hidden'), 'Listing hidden successfully.')
                    }
                    disabled={actionLoading}
                    className="inline-flex rounded-lg border border-clicon-border px-3 py-1.5 text-xs font-semibold text-clicon-darkBlue transition hover:bg-clicon-surface disabled:opacity-60"
                  >
                    Hide
                  </button>
                ) : null}
              </div>
              {actionStatus ? (
                <p className="mt-2 text-xs text-clicon-muted">{actionStatus}</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-clicon-border p-4">
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Published</p>
              <p className="mt-1 text-sm font-semibold text-clicon-slate">{formatTime(item.createdAt)}</p>
            </div>
          </aside>
        </div>
      </article>

      {isDepositModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-clicon-border bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-clicon-border px-5 py-4">
              <div>
                <h2 className="text-xl font-bold text-clicon-slate">Dummy Deposit QR</h2>
                <p className="text-xs text-clicon-muted">For demo only. No real money movement.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseDepositModal}
                disabled={depositLoading || depositConfirming}
                className="rounded-lg border border-clicon-border px-3 py-1.5 text-sm font-medium text-clicon-muted transition hover:bg-clicon-surface disabled:opacity-60"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 p-5">
              {depositLoading ? (
                <div className="rounded-xl border border-clicon-border bg-clicon-surface p-4 text-sm text-clicon-muted">
                  Generating dummy QR...
                </div>
              ) : null}
              {depositConfirming ? (
                <div className="rounded-xl border border-clicon-border bg-clicon-surface p-4 text-sm text-clicon-muted">
                  Confirming dummy deposit...
                </div>
              ) : null}

              {depositError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {depositError}
                </div>
              ) : null}

              {depositSession ? (
                <div className="space-y-3 rounded-xl border border-clicon-border bg-clicon-surface p-4">
                  <img
                    src={depositSession.qrCodeDataUrl}
                    alt="Dummy deposit QR code"
                    className="mx-auto h-56 w-56 rounded-lg border border-clicon-border bg-white p-2"
                  />
                  <div className="space-y-1 text-xs text-clicon-muted">
                    <p>
                      <span className="font-semibold text-clicon-slate">Ref:</span>{' '}
                      {depositSession.referenceId}
                    </p>
                    <p>
                      <span className="font-semibold text-clicon-slate">Amount:</span>{' '}
                      {formatVndCurrency(depositSession.amount)}
                    </p>
                    <p>
                      <span className="font-semibold text-clicon-slate">Expire:</span>{' '}
                      {formatTime(depositSession.expiresAt)}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseDepositModal}
                  disabled={depositLoading || depositConfirming}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-clicon-border px-4 text-sm font-medium text-clicon-muted transition hover:bg-clicon-surface disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDepositNext}
                  disabled={depositLoading || depositConfirming || !depositSession || Boolean(depositError)}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-clicon-primary px-4 text-sm font-semibold text-white transition hover:bg-clicon-secondary disabled:opacity-60"
                >
                  {depositConfirming ? 'Processing...' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {similarItems.length > 0 ? (
        <article className="mt-6 rounded-2xl border border-clicon-border bg-white p-5 shadow-card sm:p-6">
          <h2 className="text-xl font-semibold text-clicon-slate">Similar items</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {similarItems.map((entry) => {
              const imageUrl =
                Array.isArray(entry.imageUrls) && entry.imageUrls.length ? entry.imageUrls[0] : '';

              return (
                <Link
                  key={entry.id}
                  href={`/items/${entry.id}`}
                  className="rounded-lg border border-clicon-border bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div className="mb-2 overflow-hidden rounded-md border border-clicon-border bg-clicon-surface">
                    {imageUrl ? (
                      <img src={imageUrl} alt={entry.itemName} className="h-32 w-full object-cover" />
                    ) : (
                      <div className="grid h-32 place-content-center text-xs text-clicon-muted">No image</div>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold text-clicon-slate">{entry.itemName}</p>
                  <p className="mt-1 text-sm font-bold text-clicon-secondary">{entry.price}</p>
                </Link>
              );
            })}
          </div>
        </article>
      ) : null}
    </section>
  );
}
