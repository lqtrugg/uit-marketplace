'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearStoredAuthToken, getErrorMessage, requestJson } from '@/app/_lib/clientApi';
import PageHero from '@/app/_components/ui/PageHero';

export default function SettingsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ tone: 'info', text: '' });
  const [form, setForm] = useState({
    email: '',
    name: '',
    picture: ''
  });

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUserSettings() {
      try {
        const payload = await requestJson('/api/users/me');

        if (ignore) {
          return;
        }

        const currentUser = payload?.user;

        if (!currentUser) {
          clearStoredAuthToken();
          router.replace('/');
          return;
        }

        setForm({
          email: currentUser.email || '',
          name: currentUser.name || '',
          picture: currentUser.picture || ''
        });
      } catch (error) {
        if (!ignore) {
          clearStoredAuthToken();
          setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to load settings.') });
          router.replace('/');
        }
      } finally {
        if (!ignore) {
          setChecking(false);
        }
      }
    }

    loadCurrentUserSettings();

    return () => {
      ignore = true;
    };
  }, [router]);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setStatus({ tone: 'info', text: 'Saving profile settings...' });

    try {
      const payload = await requestJson('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          picture: form.picture
        })
      });

      setForm((previous) => ({
        ...previous,
        name: payload.user?.name || previous.name,
        picture: payload.user?.picture || ''
      }));

      setStatus({ tone: 'success', text: 'Settings updated successfully.' });
    } catch (error) {
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to update settings.') });
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <section className="app-container py-10">
        <div className="rounded-2xl border border-clicon-border bg-white p-6 text-sm text-clicon-muted">
          Loading settings...
        </div>
      </section>
    );
  }

  return (
    <section className="app-container py-8 sm:py-10">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-clicon-border bg-white p-6 shadow-card sm:p-8">
        <PageHero
          iconSrc="/clicon/image/svg/user.svg"
          title="Account Settings"
          subtitle="Update the information shown on your social profile."
          actions={[
            { href: '/settings/dashboard', label: 'Open My Item Dashboard' },
            { href: '/offers', label: 'Open My Offers' }
          ]}
        />

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Email</span>
            <input
              type="email"
              value={form.email}
              disabled
              className="h-11 rounded-xl border border-clicon-border bg-clicon-surface px-3 text-sm text-clicon-muted outline-none"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Display Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              maxLength={80}
              required
              className="h-11 rounded-xl border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-clicon-muted">Avatar URL</span>
            <input
              type="url"
              value={form.picture}
              onChange={(event) => updateField('picture', event.target.value)}
              placeholder="https://example.com/avatar.png"
              className="h-11 rounded-xl border border-clicon-border px-3 text-sm text-clicon-slate outline-none focus:border-clicon-secondary"
            />
          </label>

          {status.text ? <p className={`status status-${status.tone}`}>{status.text}</p> : null}

          <div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-clicon-primary px-5 text-sm font-semibold text-white transition hover:bg-clicon-secondary disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}
