const STORAGE_KEY = 'notes.app.items.v1';

/**
 * Shape of a Note:
 * { id: string, title: string, content: string, createdAt: number, updatedAt: number }
 */

// In-memory cached detection to avoid repeated probes and retries
let cachedApiBase = undefined; // string|null|undefined
let lastDetectionAt = 0;

/**
 * Normalize and read API base from env, if provided.
 * Ensures no trailing slash for consistent joining.
 */
function getEnvApiBase() {
  const raw = (process.env.REACT_APP_API_BASE || '').trim();
  if (!raw) return '';
  // Remove trailing slash to avoid double slashes in URLs
  return raw.replace(/\/*$/, '');
}

/**
 * Fetch helper that:
 * - applies AbortController timeout
 * - checks response.ok
 * - checks and parses JSON only when content-type is application/json
 * - avoids parsing HTML or other content as JSON
 * - returns { ok, status, headers, data, text, isJson }
 * - traps network/Abort errors and returns ok:false without throwing
 */
async function safeFetchJson(url, options = {}, { timeoutMs = 2500 } = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const contentType = res.headers?.get?.('content-type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');

    // For non-2xx, read text but do not throw
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, status: res.status, headers: res.headers, data: null, text: errText, isJson };
    }

    if (isJson) {
      const data = await res.json().catch(() => null);
      return { ok: true, status: res.status, headers: res.headers, data, text: null, isJson };
    }

    // Not JSON, read as text so caller can decide
    const text = await res.text().catch(() => '');
    return { ok: true, status: res.status, headers: res.headers, data: null, text, isJson: false };
  } catch {
    // Network failures (including 502/connection refused/timeout) should not throw into UI
    return { ok: false, status: 0, headers: null, data: null, text: '', isJson: false };
  } finally {
    clearTimeout(to);
  }
}

/**
 * Build URL safely by ensuring there is exactly one slash between base and path.
 */
function buildUrl(base, path) {
  const b = (base || '').replace(/\/*$/, '');
  const p = (path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
}

/**
 * Attempt to detect an existing backend API by probing a well-known endpoint.
 * Conditions for a positive detection:
 *   - 2xx response
 *   - Content-Type: application/json
 *   - JSON body (not HTML)
 * We try the explicit REACT_APP_API_BASE first when provided; otherwise '/api'.
 * To prevent repeated network errors:
 *   - Cache the result (string|null)
 *   - If last detection is recent (within 60s), return cached without probing
 */
async function detectApiBase() {
  const now = Date.now();
  const STICKY_MS = 60000;

  if (cachedApiBase !== undefined && now - lastDetectionAt < STICKY_MS) {
    return cachedApiBase;
  }

  const envBase = getEnvApiBase();
  const candidates = envBase ? [envBase] : ['/api'];

  for (const base of candidates) {
    // Probe /health
    const health = await safeFetchJson(buildUrl(base, '/health'), {}, { timeoutMs: 1200 });
    if (health.ok && health.isJson) {
      cachedApiBase = base;
      lastDetectionAt = now;
      return base;
    }
    // If health fails (or isn't JSON), try /notes GET expecting JSON array
    const notesProbe = await safeFetchJson(buildUrl(base, '/notes'), {}, { timeoutMs: 1500 });
    if (notesProbe.ok && notesProbe.isJson && Array.isArray(notesProbe.data)) {
      cachedApiBase = base;
      lastDetectionAt = now;
      return base;
    }
    // Any non-2xx, non-JSON, HTML, 502, 404: ignore and continue
  }

  cachedApiBase = null;
  lastDetectionAt = now;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Swallow storage quota errors to keep UI functional
  }
}

// PUBLIC_INTERFACE
export async function getNotes() {
  /** Get all notes, auto-detecting API or falling back to localStorage. */
  const api = await detectApiBase();
  if (api) {
    const { ok, isJson, data } = await safeFetchJson(buildUrl(api, '/notes'), {}, { timeoutMs: 3000 });
    if (ok && isJson && Array.isArray(data)) {
      return data;
    }
    // If API is reachable but returns non-OK or non-JSON, fall back to local
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
    }, { timeoutMs: 3000 });
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
    }, { timeoutMs: 3000 });
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
    const { ok } = await safeFetchJson(buildUrl(api, `/notes/${id}`), { method: 'DELETE' }, { timeoutMs: 3000 });
    if (ok) return true;
    // On failure, fall through to local
  }
  const list = loadLocal().filter(n => n.id !== id);
  saveLocal(list);
  return true;
}
