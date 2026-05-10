import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { applyZoom, getZoomEnabled, ZOOM_STORAGE_KEY } from './utils/zoom';

// ─── Apply Zoom Early ───────────────────────────────────────────────────────
applyZoom(getZoomEnabled());

// ─── Native to Web Communication Bridge ─────────────────────────────────────
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data && event.data.type === 'zoom-change' && typeof event.data.enabled === 'boolean') {
        localStorage.setItem(ZOOM_STORAGE_KEY, String(event.data.enabled));
        applyZoom(event.data.enabled, false);
        window.dispatchEvent(new StorageEvent('storage', {
            key: ZOOM_STORAGE_KEY,
            newValue: String(event.data.enabled),
        }));
    }
});

// ─── Disable Scroll-to-Change on Number Inputs ──────────────────────────────
document.addEventListener("wheel", () => {
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === "number") {
        document.activeElement.blur();
    }
});

// ─── Render React App ───────────────────────────────────────────────────────
const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(<App />);
}

// ─── Register Service Worker with Auto-Update ───────────────────────────────
const updateSW = registerSW({
    onNeedRefresh() {
        if (confirm('New content available. Reload?')) {
            updateSW(true);
        }
    },
    onOfflineReady() {
        console.log('App ready for offline use');
    },
});
