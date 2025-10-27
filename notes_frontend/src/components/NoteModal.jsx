import React, { useEffect, useRef, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * NoteModal shows a modal dialog for creating or editing a note.
 * Props:
 * - open: boolean
 * - initial: {id?, title, content}
 * - onClose()
 * - onSave(payload)
 */
export default function NoteModal({ open, initial, onClose, onSave }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const titleRef = useRef(null);

  useEffect(() => {
    setTitle(initial?.title || '');
    setContent(initial?.content || '');
  }, [initial, open]);

  useEffect(() => {
    if (open && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  function submit(e) {
    e.preventDefault();
    onSave({
      ...initial,
      title: title.trim(),
      content: content.trim(),
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title" id="note-modal-title">
            {initial?.id ? 'Edit note' : 'New note'}
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <label>
              <div className="small">Title</div>
              <input
                ref={titleRef}
                className="input"
                placeholder="Note title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={120}
              />
            </label>
            <label>
              <div className="small">Content</div>
              <textarea
                className="textarea"
                placeholder="Write your note..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn">{initial?.id ? 'Save changes' : 'Create note'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
