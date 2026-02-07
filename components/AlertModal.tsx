import React from 'react';
import { X } from 'lucide-react';
import { AlertModalProps } from '@/types';

const AlertModal: React.FC<AlertModalProps> = ({ children, onClose }) => {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-sm overlay-fade"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-[480px] modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button"
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors duration-200"
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