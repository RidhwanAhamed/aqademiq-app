import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const shouldRegisterPWA = import.meta.env.PROD || import.meta.env.VITE_ENABLE_PWA_DEV === 'true'

if (shouldRegisterPWA) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onRegisteredSW(swUrl) {
          console.log('[PWA] Service Worker registered', { swUrl })
        },
        onRegisterError(error) {
          console.error('[PWA] Service Worker registration failed', error)
        }
      })
    })
    .catch(() => {
      console.warn('[PWA] Registration skipped; virtual module unavailable in this mode')
    })
} else {
  console.info('[PWA] Registration disabled for current environment')
}

createRoot(document.getElementById("root")!).render(<App />);

