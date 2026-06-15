import { mount } from 'svelte'
import { registerSW } from 'virtual:pwa-register'
import './app.css'
import App from './App.svelte'

// Register the service worker and poll for updates so a freshly deployed
// bundle is picked up without waiting for a cold start. With autoUpdate the
// new SW skips waiting and reloads the page automatically once it takes over.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, reg) {
    if (reg) setInterval(() => reg.update(), 60 * 1000)
  },
})

// iOS Safari ignores user-scalable=no, so block pinch- and double-tap-zoom
// explicitly to keep the app at a fixed scale.
document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('gesturechange', (e) => e.preventDefault())
document.addEventListener('gestureend', (e) => e.preventDefault())
let lastTouchEnd = 0
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) e.preventDefault()
    lastTouchEnd = now
  },
  { passive: false },
)

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
