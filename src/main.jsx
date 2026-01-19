import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Register PWA service worker (autoUpdate handled by plugin)
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onRegistered(r) {
    // r is ServiceWorkerRegistration
  },
  onNeedRefresh() {
    // optional: trigger UI to notify user
    console.log('New content available.')
  },
  onOfflineReady() {
    console.log('App ready to work offline.')
  }
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
