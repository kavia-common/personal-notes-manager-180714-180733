const STORAGE_KEY = 'notes.app.items.v1';

/**
 * Shape of a Note:
 * { id: string, title: string, content: string, createdAt: number, updatedAt: number }
 */

/**
 * Normalize and read API base from env, if provided.
 * Ensures no trailing slash for consistent joining.
 */
function getEnvApiBase() {
  const raw = (process.env.REACT_APP_API_BASE || '').trim();
  if (!raw) return '';
  // Remove trailing slash to avoid double slashes in URLs
  return raw.replace(/\/+$/, '');
}

/**
 * Fetch helper that:
 * - applies AbortController timeout
 * - checks response.ok
 * - checks and parses JSON only when content-type is application/json
 * - avoids parsing HTML or other content as JSON
 * - returns { ok, status, headers, data, text }
 */
async function safeFetchJson(url, options = {}, { timeoutMs = 4000 } = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const contentType = res.headers?.get?.('content-type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');

    // For non-2xx, try to read text to include in error (but don't JSON.parse)
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const message = errText
        ? `Request failed (${res.status}). ${errText.slice(0, 200)}`
        : `Request failed (${res.status}).`;
      return { ok: false, status: res.status, headers: res.headers, data: null, text: errText, isJson };
    }

    if (isJson) {
      const data = await res.json().catch(() => null);
      return { ok: true, status: res.status, headers: res.headers, data, text: null, isJson };
    }

    // Not JSON, read as text so caller can decide
    const text = await res.text().catch(() => '');
    return { ok: true, status: res.status, headers: res.headers, data: null, text, isJson: false };
  } finally {
    clearTimeout(to);
  }
}

/**
 * Attempt to detect an existing backend API by probing a well-known endpoint.
 * We only consider API available if the health endpoint returns a 2xx and JSON.
 * If env base is set, we try that first; otherwise we try '/api'.
 */
async function detectApiBase() {
  const envBase = getEnvApiBase();
  const candidates = envBase ? [envBase] : ['/api'];

  for (const base of candidates) {
    try {
      const res = await safeFetchJson(`${base}/health`, {}, { timeoutMs: 1500 });
      if (res.ok && res.isJson) {
        return base;
      }
    } catch {
      // ignore probe errors
    }
  }
  return null;
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Build URL safely by ensuring there is exactly one slash between base and path.
 */
function buildUrl(base, path) {
  const b = (base || '').replace(/\/+$/, '');
  const p = (path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
}

// PUBLIC_INTERFACE
export async function getNotes() {
  /** Get all notes, auto-detecting API or falling back to localStorage. */
  const api = await detectApiBase();
  if (api) {
    const { ok, isJson, data } = await safeFetchJson(buildUrl(api, '/notes'));
    if (!ok) {
      // If API is reachable but returns non-OK or non-JSON, fall back to local
      return loadLocal().sort((a, b) => b.updatedAt - a.updatedAt);
    }
    if (!isJson) {
      // Unexpected content-type (likely HTML) — avoid JSON.parse error, fall back
      return loadLocal().sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return Array.isArray(data) ? data : [];
  }
  return loadLocal().sort((a, b) => b.updatedAt - a.updatedAt);
}

// PUBLIC_INTERFACE
export async function createNote(note) {
  /** Create a note via API if available, else localStorage. */
  const payload = {
    id: note.id || (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    title: (note.title || '').trim(),
    content: (note.content || '').trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const api = await detectApiBase();
  if (api) {
    const { ok, isJson, data } = await safeFetchJson(buildUrl(api, '/notes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (ok && isJson && data) {
      return data;
    }
    // If not ok or not JSON, gracefully fall back to local
  }
  const list = loadLocal();
  list.unshift(payload);
  saveLocal(list);
  return payload;
}

// PUBLIC_INTERFACE
export async function updateNote(id, updates) {
  /** Update a note via API if available, else localStorage. */
  const api = await detectApiBase();
  if (api) {
    const body = { ...updates, updatedAt: Date.now() };
    const { ok, isJson, data } = await safeFetchJson(buildUrl(api, `/notes/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (ok && isJson && data) {
      return data;
    }
    // If API update failed or returned non-JSON, fall through to local
  }
  const list = loadLocal();
  const idx = list.findIndex(n => n.id === id);
  if (idx === -1) throw new Error('Note not found');
  const updated = { ...list[idx], ...updates, updatedAt: Date.now() };
  list[idx] = updated;
  saveLocal(list);
  return updated;
}

// PUBLIC_INTERFACE
export async function deleteNote(id) {
  /** Delete a note via API if available, else localStorage. */
  const api = await detectApiBase();
  if (api) {
    const { ok } = await safeFetchJson(buildUrl(api, `/notes/${id}`), { method: 'DELETE' });
    if (ok) return true;
    // On failure, fall through to local
  }
  const list = loadLocal().filter(n => n.id !== id);
  saveLocal(list);
  return true;
}
