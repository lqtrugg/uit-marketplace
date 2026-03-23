'use client';

import { useEffect, useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import {
  clearStoredAuthToken,
  getErrorMessage,
  requestJson
} from '@/app/_lib/clientApi';

export default function LandingPage() {
  const router = useRouter();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState({ tone: 'info', text: '' });

  useEffect(() => {
    let ignore = false;

    async function checkSession() {
      try {
        const payload = await requestJson('/api/sessions/current');

        if (ignore) {
          return;
        }

        if (payload.user) {
          router.replace('/home');
          return;
        }

        clearStoredAuthToken();
      } catch (error) {
        if (!ignore) {
          clearStoredAuthToken();
          setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to check authentication state.') });
        }
      } finally {
        if (!ignore) {
          setChecking(false);
        }
      }
    }

    checkSession();

    return () => {
      ignore = true;
    };
  }, [router]);

  async function handleGoogleSuccess(response) {
    if (!response.credential) {
      setStatus({ tone: 'error', text: 'Google did not return a credential token.' });
      return;
    }

    setStatus({ tone: 'info', text: 'Authenticating...' });

    try {
      await requestJson('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ credential: response.credential })
      });
      router.replace('/home');
    } catch (error) {
      clearStoredAuthToken();
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Authentication failed.') });
    }
  }

  const content = (
    <section className="app-container py-10 sm:py-16">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-clicon-border bg-white shadow-card">
        <div className="grid gap-0 lg:grid-cols-2">
          <article className="bg-[#0F1C34] p-8 text-white sm:p-10">
            <p className="inline-flex rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-clicon-warning">
              UIT Marketplace
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">
              One gateway for your campus marketplace.
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/80 sm:text-base">
              Sign in with your institutional Google account. After authentication, you will be redirected to the main home page.
            </p>
          </article>

          <article className="p-8 sm:p-10">
            <h2 className="text-2xl font-semibold text-clicon-slate">Authenticate to continue</h2>
            <p className="mt-2 text-sm text-clicon-muted">Only verified `@gm.uit.edu.vn` Google accounts are accepted.</p>

            <div className="mt-6">
              {checking ? (
                <p className="text-sm text-clicon-muted">Checking current session...</p>
              ) : !googleClientId ? (
                <p className="warning">Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend environment first.</p>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setStatus({ tone: 'error', text: 'Google sign-in failed.' })}
                  useOneTap={false}
                />
              )}
            </div>

            {status.text ? <p className={`mt-4 status status-${status.tone}`}>{status.text}</p> : null}
          </article>
        </div>
      </div>
    </section>
  );

  if (!googleClientId) {
    return content;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
}
