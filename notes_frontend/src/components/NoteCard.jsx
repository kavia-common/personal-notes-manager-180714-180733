import React from 'react';

/**
 * PUBLIC_INTERFACE
 * NoteCard displays a single note with title, content preview, and action buttons.
 * Props:
 * - note: { id, title, content, createdAt, updatedAt }
 * - onEdit(note)
 * - onDelete(note)
 */
export default function NoteCard({ note, onEdit, onDelete }) {
  return (
    <div className="card" role="article" aria-label={`Note ${note.title || 'untitled'}`}>
      <div className="card-title">
        <span title={note.title || 'Untitled'}>{note.title || 'Untitled'}</span>
        <span className="tag" title="Last updated">
          ⏱ {new Date(note.updatedAt || note.createdAt).toLocaleString()}
        </span>
      </div>
      <div className="card-content">
        {(note.content || '').length ? note.content : <span className="small">No content</span>}
      </div>
      <div className="row" style={{ marginTop: 4 }}>
        <button className="btn btn-secondary" onClick={() => onEdit(note)} aria-label="Edit note">Edit</button>
        <button className="btn btn-danger" onClick={() => onDelete(note)} aria-label="Delete note">Delete</button>
        <div className="space" />
      </div>
    </div>
  );
}
