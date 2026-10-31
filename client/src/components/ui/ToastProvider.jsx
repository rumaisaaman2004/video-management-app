import { useCallback, useState } from 'react';
import CloseButton from 'react-bootstrap/CloseButton';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import { ToastContext } from './toastContext.js';

const AUTO_HIDE_MS = 4000;
const ICONS = { success: 'check-circle-fill', danger: 'x-circle-fill', info: 'info-circle-fill' };

let nextToastId = 0;

/** Shows short success/error messages in the corner; use with useToast(). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(({ message, variant = 'success' }) => {
    nextToastId += 1;
    setToasts((current) => [...current, { id: nextToastId, message, variant }]);
  }, []);

  return (
    <ToastContext value={showToast}>
      {children}
      <ToastContainer position="bottom-end" className="p-3 position-fixed" style={{ zIndex: 1090 }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            bg={toast.variant}
            autohide
            delay={AUTO_HIDE_MS}
            onClose={() => dismiss(toast.id)}
          >
            <Toast.Body className="d-flex align-items-start gap-2 text-white">
              <i className={`bi bi-${ICONS[toast.variant] ?? ICONS.info}`} aria-hidden="true" />
              <span className="flex-grow-1">{toast.message}</span>
              <CloseButton
                variant="white"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
              />
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext>
  );
}
