'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  clearStoredAuthToken,
  formatTime,
  getItemDetail,
  getErrorMessage,
  getSimilarItems,
  listMyFavoriteItems,
  makeOffer,
  requestJson,
  setItemFavorite,
  updateItemStatus
} from '@/app/_lib/clientApi';

function toReadableDuration(item) {
  const days = Number.isInteger(item?.durationDays) ? item.durationDays : 0;
  const hours = Number.isInteger(item?.durationHours) ? item.durationHours : 0;
  return `${days} day(s) ${hours} hour(s)`;
}

function parseOfferDefaultPrice(rawPrice) {
  const digitsOnly = String(rawPrice || '').replace(/[^\d]/g, '').trim();

  if (!digitsOnly) {
    return '';
  }

  return digitsOnly;
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
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);

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
          setOfferPrice(parseOfferDefaultPrice(loadedItem?.price));
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

  async function handleMakeOffer() {
    if (!item?.id || isSeller || offerSubmitting) {
      return;
    }

    const normalizedPrice = String(offerPrice || '').trim();

    try {
      setOfferSubmitting(true);
      setActionStatus('');
      await makeOffer({
        itemId: item.id,
        offeredPrice: normalizedPrice,
        message: offerMessage
      });
      setActionStatus('Offer submitted successfully.');
    } catch (error) {
      setActionStatus(getErrorMessage(error, 'Failed to submit offer.'));
    } finally {
      setOfferSubmitting(false);
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
  const canMakeOffer = !isSeller && item.listingStatus === 'active';
  const offerDisabledReason = isSeller
    ? 'Seller cannot offer on their own item.'
    : item.listingStatus !== 'active'
      ? 'This listing is closed and cannot receive offers.'
      : '';
  const canReopen = isSeller && item.listingStatus === 'hidden';
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
              <p className="text-xs uppercase tracking-wide text-clicon-muted">Make Offer</p>
              <p className="mt-1 text-sm text-clicon-muted">
                Enter your proposed price. Seller will review in dashboard.
              </p>
              <label className="mt-3 grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Offered Price (VND)</span>
                <input
                  type="text"
                  value={offerPrice}
                  onChange={(event) => setOfferPrice(event.target.value.replace(/[^\d]/g, ''))}
                  className="h-10 rounded-lg border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                  placeholder="e.g. 400000"
                />
              </label>
              <label className="mt-3 grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Message (optional)</span>
                <textarea
                  rows={3}
                  value={offerMessage}
                  onChange={(event) => setOfferMessage(event.target.value)}
                  className="rounded-lg border border-clicon-border px-3 py-2 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                  placeholder="Can meet this weekend..."
                />
              </label>
              {offerDisabledReason ? (
                <p className="mt-2 text-xs text-clicon-muted">{offerDisabledReason}</p>
              ) : null}
              <button
                type="button"
                onClick={handleMakeOffer}
                disabled={offerSubmitting || !offerPrice || !canMakeOffer}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-clicon-primary px-4 text-sm font-semibold text-white transition hover:bg-clicon-secondary disabled:opacity-60"
              >
                {offerSubmitting ? 'Submitting...' : 'Offer'}
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
