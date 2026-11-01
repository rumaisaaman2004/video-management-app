import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

/** Returns `showToast({ message, variant? })`. Must be used inside <ToastProvider>. */
export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error('useToast must be used inside <ToastProvider>');
  return showToast;
}
