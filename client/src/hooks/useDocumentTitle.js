import { useEffect } from 'react';

export const APP_NAME = 'Video Library';

/** Sets the browser tab title, e.g. "Favourites · Video Library". */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
