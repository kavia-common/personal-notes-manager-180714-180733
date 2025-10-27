import React from 'react';
import NoteCard from './NoteCard';

/**
 * PUBLIC_INTERFACE
 * NotesGrid renders a collection of notes in a responsive grid.
 * Props:
 * - notes: Note[]
 * - onEdit(note)
 * - onDelete(note)
 */
export default function NotesGrid({ notes, onEdit, onDelete }) {
  if (!notes?.length) {
    return (
      <div className="empty" role="status" aria-live="polite">
        No notes yet. Click "New note" to create your first note.
      </div>
    );
  }
  return (
    <div className="grid" role="list">
      {notes.map(n => (
        <div key={n.id} role="listitem">
          <NoteCard note={n} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}
