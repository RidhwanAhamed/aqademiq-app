import { useCallback, useSyncExternalStore } from 'react';

function getFullscreenElement(): Element | null {
  const d = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

/** True while any element is in browser fullscreen (incl. webkit). */
export function useDocumentFullscreen(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => getFullscreenElement() !== null,
    () => false
  );
}
