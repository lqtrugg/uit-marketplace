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

const MAX_MEDIA_URLS = 12;
const HCM_DEFAULT_ZIP_CODE = '700000';
const NEGOTIABLE_OPTIONS = ['Yes', 'No'];
const CONDITION_OPTIONS = ['Like New', 'Good', 'Fair', 'Poor'];
const DELIVERY_OPTIONS = ['Shipping COD', 'Meetup'];

function parseMediaUrls(rawValue) {
  if (typeof rawValue !== 'string') {
    return [];
  }

  return rawValue
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createFormFromItem(item) {
  return {
    itemName: item.itemName || '',
    description: item.description || '',
    durationDays: String(item.durationDays ?? 0),
    durationHours: String(item.durationHours ?? 0),
    wardCode: item.wardCode ? String(item.wardCode) : '',
    location: item.location || '',
    reason: item.reasonForSelling || '',
    price: item.price || '',
    zipCode: item.zipCode || HCM_DEFAULT_ZIP_CODE,
    negotiable: item.negotiable || 'Yes',
    condition: item.conditionLabel || 'Good',
    delivery: item.delivery || 'Meetup',
    imageUrlsText: Array.isArray(item.imageUrls) ? item.imageUrls.join('\n') : '',
    videoUrlsText: Array.isArray(item.videoUrls) ? item.videoUrls.join('\n') : ''
  };
}

function buildUpdatePayload(form) {
  const imageUrls = parseMediaUrls(form.imageUrlsText);
  const videoUrls = parseMediaUrls(form.videoUrlsText);

  if (imageUrls.length > MAX_MEDIA_URLS) {
    throw new Error(`Image URLs must have at most ${MAX_MEDIA_URLS} entries.`);
  }

  if (videoUrls.length > MAX_MEDIA_URLS) {
    throw new Error(`Video URLs must have at most ${MAX_MEDIA_URLS} entries.`);
  }

  return {
    itemName: form.itemName,
    description: form.description,
    durationDays: form.durationDays,
    durationHours: form.durationHours,
    wardCode: form.wardCode,
    reason: form.reason,
    price: form.price,
    negotiable: form.negotiable,
    condition: form.condition,
    delivery: form.delivery,
    postToMarketplace: true,
    imageUrls,
    videoUrls
  };
}

export default function ItemDashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState({ tone: 'info', text: '' });
  const [items, setItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(0);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(0);
  const [wardOptions, setWardOptions] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadUserItems() {
      try {
        const sessionPayload = await requestJson('/api/sessions/current');

        if (!sessionPayload.user) {
          clearStoredAuthToken();
          router.replace('/');
          return;
        }

        const [payload, wardPayload] = await Promise.all([
          requestJson('/api/items?mine=true&limit=100'),
          requestJson('/api/locations/hcm/wards?limit=2000')
        ]);

        if (!ignore) {
          setItems(Array.isArray(payload.items) ? payload.items : []);
          setWardOptions(Array.isArray(wardPayload?.wards) ? wardPayload.wards : []);
          setStatus({ tone: 'info', text: '' });
        }
      } catch (error) {
        if (!ignore) {
          setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to load your items.') });
        }
      } finally {
        if (!ignore) {
          setChecking(false);
        }
      }
    }

    loadUserItems();

    return () => {
      ignore = true;
    };
  }, [router]);

  function updateField(field, value) {
    setForm((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        [field]: value
      };
    });
  }

  function startEdit(item) {
    setEditingItemId(item.id);
    setForm(createFormFromItem(item));
    setStatus({ tone: 'info', text: '' });
  }

  function cancelEdit() {
    setEditingItemId(0);
    setForm(null);
  }

  async function handleDelete(item) {
    if (!item?.id || deletingItemId || saving) {
      return;
    }

    const confirmed = window.confirm(`Delete "${item.itemName}"? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setDeletingItemId(item.id);
    setStatus({ tone: 'info', text: 'Deleting item...' });

    try {
      await requestJson(`/api/items/${item.id}`, {
        method: 'DELETE'
      });

      setItems((previous) => previous.filter((entry) => entry.id !== item.id));

      if (editingItemId === item.id) {
        cancelEdit();
      }

      setStatus({ tone: 'success', text: 'Item deleted successfully.' });
    } catch (error) {
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to delete item.') });
    } finally {
      setDeletingItemId(0);
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!form || !editingItemId || saving) {
      return;
    }

    setSaving(true);
    setStatus({ tone: 'info', text: 'Saving item updates...' });

    try {
      const payload = await requestJson(`/api/items/${editingItemId}`, {
        method: 'PUT',
        body: JSON.stringify(buildUpdatePayload(form))
      });

      const updatedItem = payload?.item;

      if (!updatedItem?.id) {
        throw new Error('Server returned invalid updated item data.');
      }

      setItems((previous) =>
        previous.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
      setStatus({ tone: 'success', text: 'Item updated successfully.' });
      cancelEdit();
    } catch (error) {
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to update item.') });
    } finally {
      setSaving(false);
    }
  }

  const editingItem = items.find((item) => item.id === editingItemId) || null;

  if (checking) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-clicon-border bg-white p-6 text-sm text-clicon-muted">
          Loading your dashboard...
        </div>
      </section>
    );
  }

  return (
    <section className="app-container py-8 sm:py-10">
      <article className="rounded-2xl border border-clicon-border bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-clicon-border pb-4">
          <div>
            <h1 className="text-3xl font-bold text-clicon-slate">My Item Dashboard</h1>
            <p className="mt-1 text-sm text-clicon-muted">
              Manage and edit all items you have posted.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/settings"
              className="inline-flex rounded-lg border border-clicon-border px-3 py-2 text-sm font-semibold text-clicon-darkBlue transition hover:bg-clicon-surface"
            >
              Account Settings
            </Link>
            <Link
              href="/home"
              className="inline-flex rounded-lg border border-clicon-border px-3 py-2 text-sm font-semibold text-clicon-darkBlue transition hover:bg-clicon-surface"
            >
              Marketplace
            </Link>
          </div>
        </div>

        {status.text ? <p className={`status status-${status.tone}`}>{status.text}</p> : null}

        {items.length === 0 ? (
          <div className="mt-5 rounded-xl border border-clicon-border bg-clicon-surface p-5 text-sm text-clicon-muted">
            You have not posted any items yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <div className="space-y-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 ${
                    editingItemId === item.id
                      ? 'border-clicon-secondary bg-clicon-surface'
                      : 'border-clicon-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-clicon-slate">{item.itemName}</h2>
                      <p className="mt-1 text-xs text-clicon-muted">
                        {item.price} · {item.location || 'No location'} · {formatTime(item.createdAt)}
                      </p>
                    </div>
                    <Link
                      href={`/items/${item.id}`}
                      className="inline-flex rounded-lg border border-clicon-border px-3 py-1.5 text-xs font-semibold text-clicon-darkBlue transition hover:bg-white"
                    >
                      View
                    </Link>
                  </div>

                  <p className="mt-2 text-sm text-clicon-muted">
                    {item.description?.slice(0, 160)}
                    {item.description?.length > 160 ? '...' : ''}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="inline-flex rounded-lg bg-clicon-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-clicon-secondary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={deletingItemId === item.id || saving}
                      className="inline-flex rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingItemId === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="rounded-xl border border-clicon-border p-4 sm:p-5">
              {editingItem && form ? (
                <form className="space-y-4" onSubmit={handleSave}>
                  <div>
                    <h2 className="text-xl font-semibold text-clicon-slate">Edit Item #{editingItem.id}</h2>
                    <p className="mt-1 text-sm text-clicon-muted">
                      Update fields and save changes.
                    </p>
                  </div>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Item Name</span>
                    <input
                      type="text"
                      value={form.itemName}
                      onChange={(event) => updateField('itemName', event.target.value)}
                      required
                      maxLength={180}
                      className="h-11 rounded-xl border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Description</span>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(event) => updateField('description', event.target.value)}
                      required
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">
                        Duration (Days)
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={form.durationDays}
                        onChange={(event) => updateField('durationDays', event.target.value)}
                        className="h-11 rounded-xl border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                      />
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Duration (Hours)</span>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={form.durationHours}
                        onChange={(event) => updateField('durationHours', event.target.value)}
                        className="h-11 rounded-xl border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Ward / Commune (HCM)</span>
                      <select
                        value={form.wardCode}
                        onChange={(event) => updateField('wardCode', event.target.value)}
                        required
                        className="h-11 rounded-xl border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                      >
                        <option value="">Select ward/commune</option>
                        {wardOptions.map((ward) => (
                          <option key={ward.wardCode} value={ward.wardCode}>
                            {ward.wardName} - {ward.districtName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Zip Code (Auto)</span>
                      <input
                        type="text"
                        value={HCM_DEFAULT_ZIP_CODE}
                        readOnly
                        className="h-11 rounded-xl border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-1">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Price</span>
                      <input
                        type="text"
                        value={form.price}
                        onChange={(event) => updateField('price', event.target.value)}
                        required
                        maxLength={80}
                        className="h-11 rounded-xl border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Negotiable</span>
                      <select
                        value={form.negotiable}
                        onChange={(event) => updateField('negotiable', event.target.value)}
                        className="h-11 rounded-xl border border-clicon-border bg-white px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                      >
                        {NEGOTIABLE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Condition</span>
                      <select
                        value={form.condition}
                        onChange={(event) => updateField('condition', event.target.value)}
                        className="h-11 rounded-xl border border-clicon-border bg-white px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                      >
                        {CONDITION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Delivery</span>
                      <select
                        value={form.delivery}
                        onChange={(event) => updateField('delivery', event.target.value)}
                        className="h-11 rounded-xl border border-clicon-border bg-white px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
                      >
                        {DELIVERY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Reason for Selling</span>
                    <textarea
                      rows={3}
                      value={form.reason}
                      onChange={(event) => updateField('reason', event.target.value)}
                      required
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">
                      Image URLs (one URL each line)
                    </span>
                    <textarea
                      rows={3}
                      value={form.imageUrlsText}
                      onChange={(event) => updateField('imageUrlsText', event.target.value)}
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">
                      Video URLs (one URL each line)
                    </span>
                    <textarea
                      rows={3}
                      value={form.videoUrlsText}
                      onChange={(event) => updateField('videoUrlsText', event.target.value)}
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-clicon-primary px-5 text-sm font-semibold text-white transition hover:bg-clicon-secondary disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-clicon-border px-4 text-sm font-medium text-clicon-muted transition hover:bg-clicon-surface disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-xl border border-dashed border-clicon-border p-6 text-sm text-clicon-muted">
                  Choose an item on the left to start editing.
                </div>
              )}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
