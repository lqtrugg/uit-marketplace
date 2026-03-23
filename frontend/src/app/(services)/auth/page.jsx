'use client';

import { useEffect, useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider, googleLogout } from '@react-oauth/google';
import {
  clearStoredAuthToken,
  getErrorMessage,
  requestJson,
  setStoredAuthToken
} from '@/app/_lib/clientApi';

export default function AuthPage() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const [currentUser, setCurrentUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [status, setStatus] = useState({ tone: 'info', text: '' });

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const payload = await requestJson('/api/sessions/current');

        if (!ignore) {
          setCurrentUser(payload.user || null);
        }
      } catch (error) {
        if (!ignore) {
          setStatus({ tone: 'error', text: getErrorMessage(error, 'Failed to load session.') });
        }
      } finally {
        if (!ignore) {
          setLoadingSession(false);
        }
      }
    }

    loadSession();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleGoogleSuccess(response) {
    if (!response.credential) {
      setStatus({ tone: 'error', text: 'Google did not return a credential token.' });
      return;
    }

    setStatus({ tone: 'info', text: 'Authenticating...' });

    try {
      const payload = await requestJson('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ credential: response.credential })
      });

      setStoredAuthToken(payload?.jwt?.token || '');
      setCurrentUser(payload.user);
      setStatus({
        tone: 'success',
        text: payload.isNewUser
          ? `Account created for ${payload.user.email}`
          : `Welcome back ${payload.user.email}`
      });
    } catch (error) {
      setCurrentUser(null);
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Authentication failed.') });
    }
  }

  async function handleLogout() {
    try {
      await requestJson('/api/sessions/current', {
        method: 'DELETE'
      });

      clearStoredAuthToken();
      googleLogout();
      setCurrentUser(null);
      setStatus({ tone: 'info', text: 'Logged out.' });
    } catch (error) {
      setStatus({ tone: 'error', text: getErrorMessage(error, 'Logout failed.') });
    }
  }

  const content = (
    <section className="panel">
      <div className="panel-head">
        <h1>Auth Service</h1>
        <span className="domain-tag">@gm.uit.edu.vn only</span>
      </div>

      <p className="subtitle">Use Google sign-in. Only verified institutional accounts are accepted.</p>

      <div className="auth-block">
        {!googleClientId ? (
          <p className="warning">Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment first.</p>
        ) : currentUser ? (
          <div className="session-actions">
            <p>
              Signed in as <strong>{currentUser.email}</strong>
            </p>
            <button type="button" className="btn secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setStatus({ tone: 'error', text: 'Google sign-in failed.' })}
            useOneTap={false}
          />
        )}
      </div>

      <div className="hero-grid single-grid">
        <article>
          <span>Session state</span>
          <strong>{loadingSession ? 'Loading...' : currentUser ? 'Authenticated' : 'Guest'}</strong>
        </article>
      </div>

      {status.text ? <p className={`status status-${status.tone}`}>{status.text}</p> : null}
    </section>
  );

  if (!googleClientId) {
    return content;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
}
