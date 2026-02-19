import React from 'react';
import Button from './Button';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  error?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  error,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-[#ece8e3] rounded-lg shadow-xl p-6 max-w-sm w-full mx-auto" role="document">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900" id="modal-title">
            {title}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-6">
          <p>{message}</p>
          {error && <p className="mt-2 text-red-600 font-medium">Error: {error}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={!!error}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
