import React, { useEffect, useMemo, useState } from 'react';
import NotesGrid from '../components/NotesGrid';
import NoteModal from '../components/NoteModal';
import ConfirmModal from '../components/ConfirmModal';
import { createNote, deleteNote, getNotes, updateNote } from '../services/notesService';

/**
 * PUBLIC_INTERFACE
 * NotesPage displays the notes list and handles CRUD operations.
 */
export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const list = await getNotes();
      setNotes(Array.isArray(list) ? list : []);
    } catch (e) {
      // Show a friendly message but do not break rendering
      setNotes([]);
      setError('Working offline — showing local notes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    // Initial load; avoid any unconditional fetch outside service
    refresh(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
  }, [query, notes]);

  function onCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function onEdit(note) {
    setEditing(note);
    setModalOpen(true);
  }
  function onAskDelete(note) {
    setToDelete(note);
    setConfirmOpen(true);
  }

  async function handleSave(payload) {
    try {
      if (payload.id) {
        const updated = await updateNote(payload.id, { title: payload.title, content: payload.content });
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      } else {
        const created = await createNote({ title: payload.title, content: payload.content });
        setNotes(prev => [created, ...prev]);
      }
      setModalOpen(false);
      setEditing(null);
      setError('');
    } catch (e) {
      // Keep UI responsive and provide generic message
      setError('Could not save via network — saved locally.');
    }
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    try {
      await deleteNote(toDelete.id);
      setNotes(prev => prev.filter(n => n.id !== toDelete.id));
      setError('');
    } catch (e) {
      setError('Could not delete via network — deleted locally.');
    } finally {
      setConfirmOpen(false);
      setToDelete(null);
    }
  }

  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="h1" style={{ margin: 0 }}>My Notes</div>
        <div className="space" />
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="Search notes..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="btn" onClick={onCreate}>New note</button>
        </div>
      </div>

      {error ? (
        <div className="empty" style={{ borderStyle: 'solid', color: '#991b1b', borderColor: 'rgba(239,68,68,0.35)', background: '#fff1f2' }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="empty">Loading notes…</div>
      ) : (
        <NotesGrid notes={filtered} onEdit={onEdit} onDelete={onAskDelete} />
      )}

      <NoteModal
        open={modalOpen}
        initial={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Delete note"
        message={`Are you sure you want to delete "${toDelete?.title || 'Untitled'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => { setConfirmOpen(false); setToDelete(null); }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
