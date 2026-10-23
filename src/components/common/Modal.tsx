import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}

export function Modal({ title, children, onClose, className }: ModalProps) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
      if (e.key === 'Tab') {
        const nodes = dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a,input,select,[tabindex="0"]'
        );
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => {
      document.removeEventListener('keydown', handler, true);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${className ?? ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-heading" style={{ pointerEvents: 'none' }}>
          <h2 style={{ pointerEvents: 'none' }}>{title}</h2>
        </div>
        <button
          className="icon-button modal-close"
          aria-label="Close / 关闭"
          onClick={onClose}
          style={{ pointerEvents: 'auto', zIndex: 10 }}
        >
          <X size={20} />
        </button>
        {children}
      </section>
    </div>
  );
}
