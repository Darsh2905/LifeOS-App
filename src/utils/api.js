const BASE = '/api';

function getToken() {
  try {
    return localStorage.getItem('lifeos-token');
  } catch {
    return null;
  }
}

export function setToken(token) {
  if (token) localStorage.setItem('lifeos-token', token);
  else localStorage.removeItem('lifeos-token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch (err) {
    console.error('Fetch failed:', err, 'URL:', `${BASE}${path}`);
    throw new Error(`Cannot reach server: ${err.message} (URL: ${BASE}${path})`);
  }

  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  // Handle CSV / blob responses
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv')) return res.text();

  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
