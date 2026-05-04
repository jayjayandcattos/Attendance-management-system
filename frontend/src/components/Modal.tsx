import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'alert' | 'confirm' | 'error' | 'success';
  onConfirm?: () => void;
  confirmLabel?: string;
  closeLabel?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, onClose, title, message, type = 'alert', onConfirm, confirmLabel = 'Confirm', closeLabel = 'Close' 
}) => {
  if (!isOpen) return null;

  const getTypeColor = () => {
    switch (type) {
      case 'error': return 'var(--accent-red)';
      case 'success': return 'var(--accent-green)';
      case 'confirm': return 'var(--accent-blue)';
      default: return 'var(--text-primary)';
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 200000 }} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: getTypeColor() }}>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '0.5rem 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {message}
        </div>
        <div className="modal-actions">
          {type === 'confirm' && (
            <button className="btn btn-secondary" onClick={onClose}>{closeLabel}</button>
          )}
          <button 
            className={`btn ${type === 'error' ? 'btn-danger' : 'btn-primary'}`} 
            style={{ width: 'auto' }}
            onClick={() => {
              if (type === 'confirm' && onConfirm) {
                onConfirm();
              } else {
                onClose();
              }
            }}
          >
            {type === 'confirm' ? confirmLabel : closeLabel}
          </button>
        </div>
      </div>
    </div>, document.body
  );
};

export default Modal;
