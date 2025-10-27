import React from 'react';

/**
 * PUBLIC_INTERFACE
 * ConfirmModal asks user to confirm a destructive action.
 * Props:
 * - open: boolean
 * - title: string
 * - message: string
 * - confirmText?: string
 * - cancelText?: string
 * - onCancel()
 * - onConfirm()
 */
export default function ConfirmModal({
  open,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onCancel,
  onConfirm
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title" id="confirm-title">{title}</div>
          <button className="btn btn-ghost" onClick={onCancel} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div style={{ color: '#374151' }}>{message}</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>{cancelText}</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
