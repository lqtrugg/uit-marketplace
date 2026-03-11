import { useEffect, useMemo, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function loadUsers() {
  const res = await fetch(`${apiBaseUrl}/api/users`);
  if (!res.ok) {
    throw new Error('Failed to load users');
  }
  return res.json();
}

function formatTimestamp(value) {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleString();
}

function getInitials(user) {
  const source = `${user?.name || user?.email || ''}`.trim();
  if (!source) {
    return 'U';
  }

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [status, setStatus] = useState({ tone: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(true);

  const hasGoogleClientId = useMemo(
    () => Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
    []
  );

  const sortedUsers = useMemo(
    () =>
      [...users].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ),
    [users]
  );

  const newestUser = sortedUsers[0] || null;
  const recentUsers = sortedUsers.slice(0, 4);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const payload = await loadUsers();
        if (!ignore) {
          setUsers(payload.users || []);
        }
      } catch (error) {
        if (!ignore) {
          setStatus({
            tone: 'error',
            text: error.message || 'Failed to load users'
          });
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    })();

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
      const res = await fetch(`${apiBaseUrl}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential: response.credential })
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Authentication failed');
      }

      setCurrentUser(payload.user);
      setUsers(payload.users || []);
      setStatus({
        tone: 'success',
        text: payload.isNewUser
          ? `New user added: ${payload.user.email}`
          : `Welcome back: ${payload.user.email}`
      });
    } catch (error) {
      setCurrentUser(null);
      setStatus({ tone: 'error', text: error.message || 'Authentication failed' });
    }
  }

  return (
    <main className="dashboard">
      <section className="card hero-card">
        <div className="hero-top">
          <span className="badge">Access Control</span>
          <span className="domain-pill">@gm.uit.edu.vn only</span>
        </div>

        <h1>UIT Identity Gateway</h1>
        <p className="hero-copy">
          Sign in with Google to enter your approved domain. Every accepted user is persisted and
          appears in the registry immediately.
        </p>

        <div className="metric-row">
          <article className="metric-card">
            <span>Total Added Users</span>
            <strong>{users.length}</strong>
          </article>
          <article className="metric-card">
            <span>Newest Member</span>
            <strong className="metric-small">{newestUser ? newestUser.name : 'No users yet'}</strong>
          </article>
          <article className="metric-card">
            <span>API Host</span>
            <strong className="metric-small">{apiBaseUrl.replace(/^https?:\/\//, '')}</strong>
          </article>
        </div>

        <div className="login-slot">
          {!hasGoogleClientId ? (
            <p className="error">Set VITE_GOOGLE_CLIENT_ID in client/.env first.</p>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setStatus({ tone: 'error', text: 'Google sign-in failed.' })}
              useOneTap={false}
            />
          )}
        </div>

        {status.text && <p className={`status status-${status.tone}`}>{status.text}</p>}
      </section>

      <section className="split-grid">
        <article className="card current-user-card">
          <h2>Current Session</h2>
          {currentUser ? (
            <div className="profile">
              <div className="avatar">
                {currentUser.picture ? (
                  <img src={currentUser.picture} alt={currentUser.name} />
                ) : (
                  <span>{getInitials(currentUser)}</span>
                )}
              </div>
              <div>
                <p className="label">Name</p>
                <p className="value">{currentUser.name}</p>
                <p className="label">Email</p>
                <p className="value value-email">{currentUser.email}</p>
              </div>
            </div>
          ) : (
            <p className="muted">No active authenticated user yet.</p>
          )}
        </article>

        <article className="card recent-card">
          <h2>Recent Additions</h2>
          {isLoading ? (
            <p className="muted">Loading users...</p>
          ) : recentUsers.length === 0 ? (
            <p className="muted">No users added yet.</p>
          ) : (
            <ul className="recent-list">
              {recentUsers.map((user) => (
                <li key={user.googleId}>
                  <div className="avatar avatar-small">
                    {user.picture ? <img src={user.picture} alt={user.name} /> : <span>{getInitials(user)}</span>}
                  </div>
                  <div>
                    <p className="value">{user.name}</p>
                    <p className="muted tiny">{formatTimestamp(user.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="card table-card">
        <div className="table-head">
          <h2>All Added Users</h2>
          <span className="count-pill">{users.length}</span>
        </div>

        {isLoading ? (
          <p className="muted">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="muted">No users available yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Created</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.googleId}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{formatTimestamp(user.createdAt)}</td>
                    <td>{formatTimestamp(user.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
