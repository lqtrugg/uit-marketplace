export function formatTime(value) {
  if (!value) {
    return 'Unknown time';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown time';
  }

  return parsed.toLocaleString();
}

export function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

function buildApiUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${apiBaseUrl}${url}`;
  }

  return `${apiBaseUrl}/${url}`;
}

export async function requestJson(url, options = {}) {
  let response;

  try {
    response = await fetch(buildApiUrl(url), {
      cache: 'no-store',
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error(
      `Cannot reach API server at ${apiBaseUrl}. Start backend or update NEXT_PUBLIC_API_BASE_URL.`
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}
