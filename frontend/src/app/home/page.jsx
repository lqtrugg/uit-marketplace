'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearStoredAuthToken, getErrorMessage, requestJson } from '@/app/_lib/clientApi';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemStatus, setItemStatus] = useState('');
  const [items, setItems] = useState([]);
  const [geoResolved, setGeoResolved] = useState(false);
  const [nearCoordinates, setNearCoordinates] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function guardHomeRoute() {
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

    guardHomeRoute();

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

    async function resolveNearbyWardByGps() {
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

        const lat = position?.coords?.latitude;
        const lon = position?.coords?.longitude;

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          throw new Error('Invalid GPS coordinates.');
        }

        if (!cancelled) {
          setNearCoordinates({
            latitude: lat,
            longitude: lon
          });
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

    resolveNearbyWardByGps();

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
        params.set('limit', '48');

        if (keyword) {
          params.set('keyword', keyword);
        }

        if (nearCoordinates?.latitude && nearCoordinates?.longitude) {
          params.set('nearLatitude', String(nearCoordinates.latitude));
          params.set('nearLongitude', String(nearCoordinates.longitude));
        }

        const payload = await requestJson(`/api/items?${params.toString()}`);

        if (!ignore) {
          setItems(payload.items || []);
        }
      } catch (error) {
        if (!ignore) {
          setItems([]);
          setItemStatus(getErrorMessage(error, 'Failed to load items.'));
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
    <section className="app-container py-8 sm:py-10">
      <div className="rounded-2xl border border-clicon-border bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-clicon-border pb-4">
          <div>
            <h1 className="text-3xl font-bold text-clicon-slate">Item Listing Service</h1>
            <p className="mt-1 text-sm text-clicon-muted">
              Browse items posted by verified users.
            </p>
            {keyword ? (
              <p className="mt-1 text-xs font-medium text-clicon-muted">
                Search keyword: <span className="text-clicon-slate">{keyword}</span>
              </p>
            ) : null}
            {geoResolved ? (
              <p className="mt-1 text-xs font-medium text-clicon-muted">
                {nearCoordinates
                  ? 'GPS active: ưu tiên bài đăng theo khoảng cách gần nhất (chim bay).'
                  : 'GPS unavailable, dùng feed mặc định.'}
              </p>
            ) : (
              <p className="mt-1 text-xs font-medium text-clicon-muted">Đang xác định vị trí GPS...</p>
            )}
          </div>
          <p className="rounded-full bg-clicon-surface px-3 py-1 text-sm font-semibold text-clicon-slate">
            {items.length} items
          </p>
        </div>

        {itemStatus ? (
          <div className="mt-6 rounded-xl border border-clicon-border bg-clicon-surface p-5 text-sm text-clicon-muted">
            {itemStatus}
          </div>
        ) : loadingItems ? (
          <div className="mt-6 rounded-xl border border-clicon-border bg-clicon-surface p-5 text-sm text-clicon-muted">
            Loading listing...
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-xl border border-clicon-border bg-clicon-surface p-5 text-sm text-clicon-muted">
            No items found.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const imageUrl =
                Array.isArray(item.imageUrls) && item.imageUrls.length ? item.imageUrls[0] : '';

              return (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="rounded-xl border border-clicon-border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div className="mb-3 overflow-hidden rounded-lg border border-clicon-border bg-clicon-surface">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.itemName} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="grid h-40 place-content-center text-xs text-clicon-muted">No image</div>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold text-clicon-slate">{item.itemName}</p>
                  <p className="mt-2 text-xl font-bold text-clicon-secondary">{item.price}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
