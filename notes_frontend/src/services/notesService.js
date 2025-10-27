const STORAGE_KEY = 'notes.app.items.v1';

/**
 * Shape of a Note:
 * { id: string, title: string, content: string, createdAt: number, updatedAt: number }
 */

// Attempt to detect an existing backend API by probing a well-known endpoint.
async function detectApiBase() {
  const base = process.env.REACT_APP_API_BASE || '';
  const guess = base || '/api';
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${guess}/health`, { signal: ctrl.signal });
    clearTimeout(id);
    if (res.ok) return guess;
  } catch {
    // ignore
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

// PUBLIC_INTERFACE
export async function getNotes() {
  /** Get all notes, auto-detecting API or falling back to localStorage. */
  const api = await detectApiBase();
  if (api) {
    const res = await fetch(`${api}/notes`);
    if (!res.ok) throw new Error('Failed to load notes');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }
  return loadLocal().sort((a, b) => b.updatedAt - a.updatedAt);
}

// PUBLIC_INTERFACE
export async function createNote(note) {
  /** Create a note via API if available, else localStorage. */
  const payload = {
    id: note.id || crypto.randomUUID(),
    title: (note.title || '').trim(),
    content: (note.content || '').trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const api = await detectApiBase();
  if (api) {
    const res = await fetch(`${api}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create note');
    return await res.json();
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
    const res = await fetch(`${api}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, updatedAt: Date.now() }),
    });
    if (!res.ok) throw new Error('Failed to update note');
    return await res.json();
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
    const res = await fetch(`${api}/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete note');
    return true;
  }
  const list = loadLocal().filter(n => n.id !== id);
  saveLocal(list);
  return true;
}
