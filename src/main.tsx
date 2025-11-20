import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'react-day-picker/style.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
  onRegisteredSW(swUrl) {
    console.log('[PWA] Service Worker registered', { swUrl })
  },
  onRegisterError(error) {
    console.error('[PWA] Service Worker registration failed', error)
  }
})

createRoot(document.getElementById("root")!).render(<App />);

