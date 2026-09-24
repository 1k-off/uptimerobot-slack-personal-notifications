import React from 'react';
import { X } from 'lucide-react';
import { AlertModalProps } from '@/types';

const AlertModal: React.FC<AlertModalProps> = ({ children, onClose }) => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 dark:bg-black/70 backdrop-blur-sm overlay-fade px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] p-8 shadow-2xl modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200 cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        {children}
      </div>
    </div>
  );
};

export default AlertModal;
