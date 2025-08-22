// src/Inventory/ui/Toast.jsx
// Toast notification component

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const TOAST_ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const TOAST_STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
};

const TOAST_ICON_STYLES = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600'
};

export function Toast({ toast, onClose }) {
  const { id, message, type, duration } = toast;
  const Icon = TOAST_ICONS[type] || Info;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        transform transition-all duration-300 ease-in-out
        ${TOAST_STYLES[type]}
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${TOAST_ICON_STYLES[type]}`} />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{message}</p>
      </div>

      <button
        onClick={() => onClose(id)}
        className={`
          flex-shrink-0 p-1 rounded-full transition-colors
          hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2
          ${type === 'error' ? 'focus:ring-red-500' : 'focus:ring-blue-500'}
        `}
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={onClose}
        />
      ))}
    </div>
  );
}