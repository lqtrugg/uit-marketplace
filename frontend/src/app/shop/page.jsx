'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearStoredAuthToken,
  getErrorMessage,
  getItemFilterOptions,
  listItems,
  requestJson
} from '@/app/_lib/clientApi';

const PAGE_SIZE = 16;
const CONDITION_OPTIONS = ['Like New', 'Good', 'Fair', 'Poor'];
const DELIVERY_OPTIONS = ['Shipping COD', 'Meetup'];
const NEGOTIABLE_OPTIONS = ['Yes', 'No'];

function toPriceNumber(price) {
  const digits = String(price || '')
    .replace(/[^\d]/g, '')
    .trim();

  if (!digits) {
    return 0;
  }

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPriceNumber(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }

  return new Intl.NumberFormat('vi-VN').format(value);
}

export default function ShopPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState('');
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemStatus, setItemStatus] = useState('');
  const [geoResolved, setGeoResolved] = useState(false);
  const [nearCoordinates, setNearCoordinates] = useState(null);
  const [items, setItems] = useState([]);
  const [sortMode, setSortMode] = useState('recent');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState([]);
  const [selectedNegotiable, setSelectedNegotiable] = useState([]);
  const [requireImageOnly, setRequireImageOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [filterOptions, setFilterOptions] = useState(null);

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
    if (typeof window === 'undefined') {
      return;
    }

    const parsed = new URLSearchParams(window.location.search).get('q') || '';
    setKeyword(parsed.trim());
  }, []);

  useEffect(() => {
    if (checking) {
      return;
    }

    let cancelled = false;

    async function resolveGps() {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setGeoResolved(true);
        return;
      }

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        const latitude = position?.coords?.latitude;
        const longitude = position?.coords?.longitude;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error('Invalid GPS coordinates.');
        }

        if (!cancelled) {
          setNearCoordinates({ latitude, longitude });
        }
      } catch {
        if (!cancelled) {
          setNearCoordinates(null);
        }
      } finally {
        if (!cancelled) {
          setGeoResolved(true);
        }
      }
    }

    resolveGps();

    return () => {
      cancelled = true;
    };
  }, [checking]);

  useEffect(() => {
    if (checking || !geoResolved) {
      return;
    }

    let ignore = false;

    async function loadItems() {
      setLoadingItems(true);
      setItemStatus('');

      try {
        const params = new URLSearchParams();
        params.set('limit', '300');

        if (keyword) {
          params.set('keyword', keyword);
        }

        if (nearCoordinates?.latitude && nearCoordinates?.longitude) {
          params.set('nearLatitude', String(nearCoordinates.latitude));
          params.set('nearLongitude', String(nearCoordinates.longitude));
        }

        const payload = await listItems(Object.fromEntries(params.entries()));

        if (!ignore) {
          setItems(Array.isArray(payload?.items) ? payload.items : []);
        }
      } catch (error) {
        if (!ignore) {
          setItems([]);
          setItemStatus(getErrorMessage(error, 'Failed to load shop data.'));
        }
      } finally {
        if (!ignore) {
          setLoadingItems(false);
        }
      }
    }

    loadItems();

    return () => {
      ignore = true;
    };
  }, [checking, geoResolved, keyword, nearCoordinates?.latitude, nearCoordinates?.longitude]);

  useEffect(() => {
    let ignore = false;

    async function loadFilterOptions() {
      try {
        const payload = await getItemFilterOptions();

        if (!ignore) {
          setFilterOptions(payload || null);
        }
      } catch {
        if (!ignore) {
          setFilterOptions(null);
        }
      }
    }

    loadFilterOptions();

    return () => {
      ignore = true;
    };
  }, []);

  function toggleFilterValue(value, list, setter) {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    setPage(1);
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    setSelectedConditions([]);
    setSelectedDelivery([]);
    setSelectedNegotiable([]);
    setRequireImageOnly(false);
    setSortMode('recent');
    setPage(1);
  }

  const filteredItems = useMemo(() => {
    const min = Number.parseInt(String(minPrice || '').replace(/[^\d]/g, ''), 10);
    const max = Number.parseInt(String(maxPrice || '').replace(/[^\d]/g, ''), 10);
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : Number.POSITIVE_INFINITY;

    const next = items.filter((item) => {
      const priceValue = toPriceNumber(item.price);
      const conditionOk =
        selectedConditions.length === 0 || selectedConditions.includes(item.conditionLabel || '');
      const deliveryOk =
        selectedDelivery.length === 0 || selectedDelivery.includes(item.delivery || '');
      const negotiableOk =
        selectedNegotiable.length === 0 || selectedNegotiable.includes(item.negotiable || '');
      const imageOk =
        !requireImageOnly || (Array.isArray(item.imageUrls) && item.imageUrls.length > 0);

      return (
        priceValue >= safeMin &&
        priceValue <= safeMax &&
        conditionOk &&
        deliveryOk &&
        negotiableOk &&
        imageOk
      );
    });

    if (sortMode === 'price-asc') {
      return [...next].sort((a, b) => toPriceNumber(a.price) - toPriceNumber(b.price));
    }

    if (sortMode === 'price-desc') {
      return [...next].sort((a, b) => toPriceNumber(b.price) - toPriceNumber(a.price));
    }

    if (sortMode === 'name') {
      return [...next].sort((a, b) => String(a.itemName || '').localeCompare(String(b.itemName || ''), 'vi'));
    }

    return [...next].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [
    items,
    minPrice,
    maxPrice,
    selectedConditions,
    selectedDelivery,
    selectedNegotiable,
    requireImageOnly,
    sortMode
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  if (checking) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-clicon-border bg-white p-6 text-sm text-clicon-muted">
          Validating JWT session...
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

  return (
    <section className="app-container py-7 sm:py-10">
      <div className="rounded-2xl border border-clicon-border bg-white p-4 shadow-card sm:p-5">
        <div className="mb-4 border-b border-clicon-border pb-3">
          <p className="text-xs text-clicon-muted">
            Home &gt; Shop &gt; <span className="font-semibold text-clicon-slate">Shop Grid</span>
          </p>
          <h1 className="mt-2 text-3xl font-bold text-clicon-slate">Shop Page</h1>
          <p className="mt-1 text-sm text-clicon-muted">
            {nearCoordinates
              ? 'GPS active: ưu tiên nguồn dữ liệu gần bạn.'
              : 'GPS unavailable: đang dùng nguồn dữ liệu mặc định.'}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-xl border border-clicon-border bg-clicon-surface p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-clicon-muted">Category</p>
              <p className="mt-2 rounded-lg border border-dashed border-clicon-border bg-white px-3 py-2 text-sm text-clicon-muted">
                Category filter: coming soon
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-clicon-muted">Price Range</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={minPrice}
                  onChange={(event) => {
                    setMinPrice(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Min price"
                  className="h-10 rounded-lg border border-clicon-border px-3 text-sm outline-none focus:border-clicon-secondary"
                />
                <input
                  type="text"
                  value={maxPrice}
                  onChange={(event) => {
                    setMaxPrice(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Max price"
                  className="h-10 rounded-lg border border-clicon-border px-3 text-sm outline-none focus:border-clicon-secondary"
                />
              </div>
              <p className="mt-1 text-xs text-clicon-muted">
                {formatPriceNumber(Number.parseInt(minPrice.replace(/[^\d]/g, ''), 10)) || '0'} -{' '}
                {formatPriceNumber(Number.parseInt(maxPrice.replace(/[^\d]/g, ''), 10)) || 'Unlimited'}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-clicon-muted">Condition</p>
              <div className="mt-2 space-y-2">
                {(Array.isArray(filterOptions?.conditions) && filterOptions.conditions.length
                  ? filterOptions.conditions
                  : CONDITION_OPTIONS
                ).map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm text-clicon-slate">
                    <input
                      type="checkbox"
                      checked={selectedConditions.includes(option)}
                      onChange={() => toggleFilterValue(option, selectedConditions, setSelectedConditions)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-clicon-muted">Delivery</p>
              <div className="mt-2 space-y-2">
                {(Array.isArray(filterOptions?.deliveries) && filterOptions.deliveries.length
                  ? filterOptions.deliveries
                  : DELIVERY_OPTIONS
                ).map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm text-clicon-slate">
                    <input
                      type="checkbox"
                      checked={selectedDelivery.includes(option)}
                      onChange={() => toggleFilterValue(option, selectedDelivery, setSelectedDelivery)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-clicon-muted">Negotiable</p>
              <div className="mt-2 space-y-2">
                {(Array.isArray(filterOptions?.negotiables) && filterOptions.negotiables.length
                  ? filterOptions.negotiables
                  : NEGOTIABLE_OPTIONS
                ).map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm text-clicon-slate">
                    <input
                      type="checkbox"
                      checked={selectedNegotiable.includes(option)}
                      onChange={() => toggleFilterValue(option, selectedNegotiable, setSelectedNegotiable)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-clicon-border bg-white px-3 py-2 text-sm text-clicon-slate">
              <input
                type="checkbox"
                checked={requireImageOnly}
                onChange={(event) => {
                  setRequireImageOnly(event.target.checked);
                  setPage(1);
                }}
              />
              Chỉ hiển thị bài có ảnh
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-clicon-border bg-white text-sm font-semibold text-clicon-slate hover:bg-clicon-surface"
            >
              Reset filters
            </button>
          </aside>

          <div className="space-y-4">
            <div className="rounded-xl border border-clicon-border bg-clicon-surface p-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_160px]">
                <form action="/shop" method="get" className="flex items-center gap-2">
                  <input
                    type="search"
                    name="q"
                    defaultValue={keyword}
                    placeholder="Search products..."
                    className="h-10 w-full rounded-lg border border-clicon-border bg-white px-3 text-sm outline-none focus:border-clicon-secondary"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-clicon-primary px-4 text-sm font-semibold text-white hover:bg-clicon-secondary"
                  >
                    Search
                  </button>
                </form>

                <select
                  value={sortMode}
                  onChange={(event) => {
                    setSortMode(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-clicon-border bg-white px-3 text-sm outline-none focus:border-clicon-secondary"
                >
                  <option value="recent">Sort: Recent</option>
                  <option value="price-asc">Sort: Price Low-High</option>
                  <option value="price-desc">Sort: Price High-Low</option>
                  <option value="name">Sort: Name A-Z</option>
                </select>

                <div className="grid h-10 place-content-center rounded-lg border border-clicon-border bg-white text-sm text-clicon-muted">
                  {filteredItems.length} results
                </div>
              </div>
            </div>

            {itemStatus ? (
              <div className="rounded-xl border border-clicon-border bg-clicon-surface p-4 text-sm text-clicon-muted">
                {itemStatus}
              </div>
            ) : loadingItems ? (
              <div className="rounded-xl border border-clicon-border bg-clicon-surface p-4 text-sm text-clicon-muted">
                Loading shop data...
              </div>
            ) : pageItems.length === 0 ? (
              <div className="rounded-xl border border-clicon-border bg-clicon-surface p-4 text-sm text-clicon-muted">
                No items found with current filters.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pageItems.map((item) => {
                  const imageUrl =
                    Array.isArray(item.imageUrls) && item.imageUrls.length ? item.imageUrls[0] : '';

                  return (
                    <Link
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="rounded-lg border border-clicon-border bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-card"
                    >
                      <div className="mb-2 overflow-hidden rounded-md border border-clicon-border bg-clicon-surface">
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.itemName} className="h-36 w-full object-cover" />
                        ) : (
                          <div className="grid h-36 place-content-center text-xs text-clicon-muted">No image</div>
                        )}
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold text-clicon-slate">{item.itemName}</p>
                      <p className="mt-1 text-lg font-bold text-clicon-secondary">{item.price}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-clicon-muted">{item.location || 'TP.HCM'}</p>
                    </Link>
                  );
                })}
              </div>
            )}

            {filteredItems.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-clicon-border px-3 text-sm disabled:opacity-50"
                >
                  {'<'}
                </button>
                {Array.from({ length: totalPages }).slice(0, 7).map((_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm ${
                        currentPage === pageNumber
                          ? 'border-clicon-primary bg-clicon-primary text-white'
                          : 'border-clicon-border bg-white text-clicon-slate'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-clicon-border px-3 text-sm disabled:opacity-50"
                >
                  {'>'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
