# Complete PWA Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Build Configuration](#build-configuration)
4. [Manifest Configuration](#manifest-configuration)
5. [Service Worker Implementation](#service-worker-implementation)
6. [React Integration](#react-integration)
7. [Install Prompt & Banner](#install-prompt--banner)
8. [Offline Sync Feature](#offline-sync-feature)
9. [Native App Wrappers (Android & iOS)](#native-app-wrappers-android--ios)
10. [Build & Deployment Process](#build--deployment-process)
11. [Complete Flow Diagram](#complete-flow-diagram)

---

## Overview

This is a **Progressive Web App (PWA)** built with:
- **Frontend Framework:** React 18.2.0 with TypeScript
- **Build Tool:** Vite 7.3.1
- **PWA Plugin:** vite-plugin-pwa 1.2.0
- **Deployment:** Fully functional as web PWA + native app wrappers (Android & iOS)

**Features:**
- ✅ Installable as native app
- ✅ Offline-first with service worker caching
- ✅ Automatic updates with user prompt
- ✅ Offline sync queue for API calls
- ✅ Native app support (Android WebView + iOS WKWebView)
- ✅ Responsive, mobile-optimized UI
- ✅ SEO optimized

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Application                     │
│  (App.tsx, Components, Pages, Hooks, Context)          │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │ usePWA │  │useOffline  │ useTheme │
    │  Hook  │  │Sync Hook   │  Hook    │
    └────────┘  └────────┘  └──────────┘
        │           │           │
        └───────────┼───────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌────────────┐ ┌──────────┐ ┌──────────────┐
│Service     │ │Manifest  │ │HTML Meta Tags│
│Worker (SW) │ │ JSON     │ │& Links       │
└────────────┘ └──────────┘ └──────────────┘
    │               │               │
    └───────────────┼───────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
        ▼                        ▼
    ┌──────────┐          ┌──────────────┐
    │ Browser  │          │ Native Apps  │
    │   PWA    │          │ (iOS/Android)│
    └──────────┘          └──────────────┘
```

---

## Build Configuration

### 1. Package.json Dependencies

**File:** `package.json`

```json
{
    "name": "school-fee-management-frontend",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite --host",
        "build": "vite build",
        "preview": "vite preview"
    },
    "dependencies": {
        "@google/generative-ai": "^0.24.1",
        "@tanem/react-nprogress": "^5.0.53",
        "@tanstack/react-query": "^5.90.21",
        "@tanstack/react-query-devtools": "^5.91.3",
        "apexcharts": "^4.3.0",
        "axios": "^1.13.5",
        "bootstrap": "^5.3.3",
        "command-score": "^0.1.2",
        "date-fns": "^3.6.0",
        "feather-icons-react": "^0.7.0",
        "framer-motion": "^12.34.3",
        "fuse.js": "^7.1.0",
        "jspdf": "^2.5.2",
        "jspdf-autotable": "^3.8.4",
        "lodash-es": "^4.17.23",
        "papaparse": "^5.5.3",
        "prop-types": "^15.8.1",
        "react": "^18.2.0",
        "react-apexcharts": "^1.7.0",
        "react-bootstrap": "^2.10.4",
        "react-dom": "^18.2.0",
        "react-hot-toast": "^2.6.0",
        "react-icons": "^5.5.0",
        "react-router-dom": "^6.30.3",
        "recharts": "^2.15.4",
        "sass": "^1.97.3",
        "simplebar-react": "^3.2.6",
        "styled-components": "^6.1.13",
        "xlsx": "^0.18.5",
        "yup": "^1.4.0",
        "zustand": "^5.0.12"
    },
    "devDependencies": {
        "@mantine/core": "^8.3.15",
        "@mantine/dates": "^8.3.15",
        "@mantine/hooks": "^8.3.15",
        "@mantine/notifications": "^8.3.15",
        "@tabler/icons-react": "^3.37.1",
        "@types/lodash-es": "^4.17.12",
        "@types/react": "^19.2.14",
        "@types/react-dom": "^19.2.3",
        "@types/react-router-dom": "^5.3.3",
        "@vitejs/plugin-react": "^5.2.0",
        "autoprefixer": "^10.4.24",
        "dayjs": "^1.11.19",
        "postcss": "^8.5.6",
        "tailwindcss": "^4.2.0",
        "typescript": "^5.9.3",
        "vite": "^7.3.1",
        "vite-plugin-pwa": "^1.2.0"
    }
}
```

**Critical Dependency:**
```json
"vite-plugin-pwa": "^1.2.0"
```

This plugin automatically:
- Generates the service worker
- Creates the manifest.json
- Configures workbox for caching
- Handles SW registration

---

### 2. Vite Configuration

**File:** `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            // ─── Service Worker Registration ───────────────────────────────
            registerType: 'autoUpdate',
            // autoUpdate: SW updates automatically without user confirmation
            // prompt: Shows confirm dialog when SW needs update
            
            // ─── Assets to Pre-cache ────────────────────────────────────────
            includeAssets: [
                'favicon.ico',
                'apple-touch-icon.png',
                'mask-icon.svg'
            ],
            
            // ─── Web App Manifest ──────────────────────────────────────────
            manifest: {
                name: 'Oxford School Management',
                short_name: 'OxfordSchool',
                description: 'School Fee & Salary Management System',
                theme_color: '#4f46e5',
                background_color: '#ffffff',
                display: 'standalone',
                // display options:
                //   - 'standalone': Full-screen app, no browser UI
                //   - 'fullscreen': Maximum screen real estate
                //   - 'minimal-ui': Browser UI minimal
                //   - 'browser': Standard browser window
                
                orientation: 'portrait',
                // Forces portrait orientation on install
                
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                        // 'any': Used as app icon
                    },
                    {
                        src: 'maskable-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable'
                        // 'maskable': Adaptive icon for Android 13+
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'maskable-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            },
            
            // ─── Development Mode Settings ──────────────────────────────────
            devOptions: {
                enabled: true
                // PWA works in development mode
            }
        })
    ],
    
    // ─── Development Server ─────────────────────────────────────────────────
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true
            }
        }
    }
})
```

**Key Configuration Decisions:**

| Setting | Value | Why |
|---------|-------|-----|
| `registerType` | `autoUpdate` | Updates without annoying user |
| `display` | `standalone` | Remove browser UI for app feel |
| `orientation` | `portrait` | Best for mobile |
| `purpose: maskable` | For Android 13+ | Adaptive icon support |

---

## Manifest Configuration

### Complete Manifest.json

**File:** `public/manifest.json`

```json
{
  "id": "https://oxfordschool.cc/",
  "name": "Oxford School Chityala – Fee Management",
  "short_name": "Oxford School",
  "description": "Official fee and salary management system for Oxford School Chityala, Telangana.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0f172a",
  "theme_color": "#1a237e",
  "lang": "en-IN",
  "dir": "ltr",
  "categories": ["education", "productivity", "finance"],
  
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  
  "screenshots": [
    {
      "src": "/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "label": "Oxford School Dashboard"
    }
  ]
}
```

**Manifest Field Explanation:**

| Field | Value | Purpose |
|-------|-------|---------|
| `id` | URL | Unique identifier for your app |
| `name` | Full name | Shown during install |
| `short_name` | Short name | Shown under home screen icon |
| `description` | Description | Shown in app stores |
| `start_url` | `/` | Page opened when installed |
| `scope` | `/` | URLs covered by PWA |
| `display` | `standalone` | Full-screen app mode |
| `orientation` | `portrait` | Lock to portrait |
| `theme_color` | Hex color | Status bar color |
| `background_color` | Hex color | Splash screen color |
| `categories` | Array | App store categories |
| `icons` | Array | Icons for different sizes |
| `screenshots` | Array | Screenshots for install prompt |

**Icon Requirements:**

You need these icon files in `public/` folder:
- `icons/icon-192.png` - Regular icon (192x192)
- `icons/icon-512.png` - Regular icon (512x512)
- `maskable-192x192.png` - Adaptive icon (192x192)
- `maskable-512x512.png` - Adaptive icon (512x512)

**Create Maskable Icons:**
1. Take your original icon
2. Add transparent padding (at least 8% on all sides)
3. Save as PNG
4. Use tools like https://web-app-manifest-generator.netlify.app/

---

## Service Worker Implementation

### Complete Service Worker Code

**File:** `public/sw.js`

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER - Handles caching, offline support, and background sync
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'school-fee-mgmt-v1';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL EVENT
// ─────────────────────────────────────────────────────────────────────────────
// Fired when SW is first registered. Cache critical assets.
self.addEventListener('install', (event) => {
    console.log('[SW] Install event fired');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets:', STATIC_ASSETS);
            return cache.addAll(STATIC_ASSETS);
        })
    );
    
    // Activate immediately without waiting for existing tabs to close
    self.skipWaiting();
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE EVENT
// ─────────────────────────────────────────────────────────────────────────────
// Fired when SW becomes active. Clean up old cache versions.
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event fired');
    
    event.waitUntil(
        caches.keys().then((keys) => {
            console.log('[SW] Available caches:', keys);
            
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        })
    );
    
    // Take control of all clients immediately
    self.clients.claim();
});

// ─────────────────────────────────────────────────────────────────────────────
// FETCH EVENT
// ─────────────────────────────────────────────────────────────────────────────
// Intercepts all network requests. Implements cache-first strategy.
self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Log fetch
    console.log('[SW] Fetch:', event.request.url);

    event.respondWith(
        // 1. Try to get from cache first
        caches.match(event.request).then((cached) => {
            if (cached) {
                console.log('[SW] Serving from cache:', event.request.url);
                return cached;
            }

            // 2. If not in cache, fetch from network
            return fetch(event.request).then((response) => {
                // Only cache successful responses
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Clone response for caching (can only use once)
                const responseClone = response.clone();
                
                // Cache the response for future use
                caches.open(CACHE_NAME).then((cache) => {
                    console.log('[SW] Caching response:', event.request.url);
                    cache.put(event.request, responseClone);
                });

                return response;
            });
        })
        .catch((error) => {
            console.error('[SW] Fetch error:', error);
            // Return offline page if available
            return caches.match('/index.html');
        })
    );
});
```

**How Service Worker Works:**

```
┌─────────────────────────────────────────────────┐
│          User Makes Network Request              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │  FETCH Event Intercepted  │
         │   by Service Worker       │
         └────────┬──────────────────┘
                  │
         ┌────────▼────────┐
         │ Cache.match()   │
         └────────┬────────┘
                  │
         ┌────────▼──────────────┐
         │  Found in Cache?      │
         └────────┬────────┬─────┘
                  │        │
              YES │        │ NO
                  ▼        ▼
             Return   Fetch from
             Cached   Network
             Response │
                      │
              ┌───────▼────────┐
              │ Clone Response  │
              │ & Cache It      │
              └────────┬────────┘
                       │
                       ▼
              Return Fresh Response
```

**Caching Strategy Used: Cache-First**
- ✅ **Fast:** Serves from cache immediately
- ✅ **Offline:** Works without internet
- ⚠️ **Staleness:** May show old content

For dynamic data (API calls), use network-first instead by modifying the fetch handler for `/api/` routes.

---

## React Integration

### 1. HTML Entry Point

**File:** `index.html`

```html
<!DOCTYPE html>
<html lang="en-IN">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Primary SEO Meta Tags -->
  <title>Oxford School Chityala – Fee & Salary Management System</title>
  <meta name="title" content="Oxford School Chityala – Fee & Salary Management System" />
  <meta name="description" content="Oxford School Chityala's official fee and salary management portal. Manage student fee records, staff salaries, attendance, expenses, and financial reports — all in one secure platform." />
  <meta name="keywords" content="Oxford School Chityala, school fee management, Chityala school, student fees, salary management, school management system" />
  <meta name="author" content="Oxford School Chityala" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <link rel="canonical" href="https://oxfordschool.cc/" />

  <!-- Geo / Local SEO -->
  <meta name="geo.region" content="IN-TG" />
  <meta name="geo.placename" content="Chityala, Telangana, India" />
  <meta name="geo.position" content="16.7;79.1" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://oxfordschool.cc/" />
  <meta property="og:site_name" content="Oxford School Chityala" />
  <meta property="og:title" content="Oxford School Chityala – Fee & Salary Management" />
  <meta property="og:description" content="Manage student fee records, staff salaries, attendance, and financial reports." />
  <meta property="og:image" content="https://oxfordschool.cc/logo.png" />
  <meta property="og:locale" content="en_IN" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Oxford School Chityala – Fee & Salary Management" />
  <meta name="twitter:description" content="Manage student fee records, staff salaries, attendance, and financial reports." />
  <meta name="twitter:image" content="https://oxfordschool.cc/logo.png" />

  <!-- ─── PWA / Theme Configuration ─────────────────────────────────────── -->
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#1a237e" />
  
  <!-- Mobile App Capabilities -->
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Oxford School" />

  <!-- Favicon & Icons -->
  <link rel="icon" type="image/svg+xml" href="/logo.svg" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
  </style>
</head>

<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>

</html>
```

**Critical PWA Meta Tags:**

```html
<!-- Link to manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- Status bar color on Android -->
<meta name="theme-color" content="#1a237e" />

<!-- iOS specific -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Oxford School" />

<!-- Home screen icon -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

---

### 2. Main Entry Point with SW Registration

**File:** `src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register';
import { applyZoom, getZoomEnabled, ZOOM_STORAGE_KEY } from './utils/zoom';

// ─── Apply Zoom Early ───────────────────────────────────────────────────────
// Must be done before first render so viewport meta is correct
applyZoom(getZoomEnabled());

// ─── Native to Web Communication Bridge ─────────────────────────────────────
// Android (Kotlin) and iOS (Swift) can call:
//   webView.evaluateJavascript("window.postMessage({ type:'zoom-change', enabled: true })", null)
// This listener synchronizes zoom settings between native and web layers
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data && event.data.type === 'zoom-change' && typeof event.data.enabled === 'boolean') {
        // Persist to localStorage
        localStorage.setItem(ZOOM_STORAGE_KEY, String(event.data.enabled));
        // Apply viewport change
        applyZoom(event.data.enabled, false);
        // Fire storage event for hook subscribers
        window.dispatchEvent(new StorageEvent('storage', {
            key: ZOOM_STORAGE_KEY,
            newValue: String(event.data.enabled),
        }));
    }
});

// ─── Render React App ───────────────────────────────────────────────────────
const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    );
}

// ─── Register Service Worker with Auto-Update ───────────────────────────────
// virtual:pwa-register is auto-generated by vite-plugin-pwa
const updateSW = registerSW({
    onNeedRefresh() {
        // Prompt user when new version available
        if (confirm('New content available. Reload?')) {
            updateSW(true);
        }
    },
    onOfflineReady() {
        // Service worker ready to work offline
        console.log('App ready for offline use');
    },
});
```

**Key Concepts:**

1. **`virtual:pwa-register`** - Virtual module auto-generated by Vite PWA plugin
   - No actual file exists
   - Vite injects SW registration code during build
   
2. **`onNeedRefresh`** - Called when SW detects updates
   - Shows user a confirmation
   - Calls `updateSW(true)` to activate new version
   
3. **`onOfflineReady`** - Called when SW is ready
   - Logs to console
   - App is ready for offline use

---

### 3. PWA Install Hook

**File:** `src/hooks/usePWA.ts`

```typescript
import { useState, useEffect } from 'react';

/**
 * Type definition for browser's install prompt event
 */
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

// ─── Module-Level Storage ───────────────────────────────────────────────────
// Capture the beforeinstallprompt event at module level so it's never missed
// even if React components mount/unmount before the event fires
let _deferredPrompt: BeforeInstallPromptEvent | null = null;
const _subscribers = new Set<() => void>();

// ─── Capture Browser Install Prompt ─────────────────────────────────────────
window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent default browser UI
    e.preventDefault();
    
    // Store the event for later use
    _deferredPrompt = e as BeforeInstallPromptEvent;
    
    // Notify all subscribers (React components) that prompt is ready
    _subscribers.forEach(fn => fn());
});

// ─── App Installed ──────────────────────────────────────────────────────────
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed to home screen');
    _deferredPrompt = null;
    _subscribers.forEach(fn => fn());
});

/**
 * React Hook: Manage PWA installation
 * 
 * Returns:
 * - isInstallable: boolean - true if browser supports PWA install
 * - installApp: () => Promise<void> - trigger install dialog
 */
export function usePWA() {
    // Initialize with stored prompt
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(_deferredPrompt);
    
    // Can only install if we have the prompt event
    const isInstallable = !!installPrompt;

    useEffect(() => {
        // Sync function: updates state when prompt event fires
        const sync = () => setInstallPrompt(_deferredPrompt);
        
        // Register this component as a subscriber
        _subscribers.add(sync);
        
        // Sync in case event already fired before component mounted
        sync();
        
        // Cleanup
        return () => { 
            _subscribers.delete(sync); 
        };
    }, []);

    /**
     * Trigger the OS install dialog
     * 
     * Flow:
     * 1. Call prompt() to show OS install UI
     * 2. Wait for user choice (accept or dismiss)
     * 3. Clear prompt if accepted (can't be used again)
     */
    const installApp = async () => {
        if (!installPrompt) return;

        // Show the OS install prompt
        await installPrompt.prompt();
        
        // Wait for user choice
        const { outcome } = await installPrompt.userChoice;

        // If accepted, clear the prompt (can only be used once)
        if (outcome === 'accepted') {
            _deferredPrompt = null;
            setInstallPrompt(null);
        }
    };

    return { isInstallable, installApp };
}
```

**How It Works:**

```
1. beforeinstallprompt fires (browser only, not on installed PWA)
   ↓
2. usePWA captures event in module-level variable
   ↓
3. Component subscribes to changes
   ↓
4. User clicks Install button
   ↓
5. installApp() calls prompt()
   ↓
6. OS shows install dialog
   ↓
7. User accepts or dismisses
   ↓
8. Event cannot be reused (one-time use)
```

---

## Install Prompt & Banner

### InstallPromptBanner Component

**File:** `src/components/InstallPromptBanner.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWA } from '../hooks/usePWA';

/**
 * Floating install banner shown at the bottom of every page (including login)
 * when the browser fires `beforeinstallprompt`.
 * 
 * This makes the "Add to Home Screen" action discoverable without requiring
 * the user to look in the browser's menu.
 */
export default function InstallPromptBanner() {
    const { isInstallable, installApp } = usePWA();
    const [dismissed, setDismissed] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Hide banner when already running as an installed PWA
        // (display-mode: standalone) means app is installed and running full-screen
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsStandalone(true);
        }
    }, []);

    const handleInstall = async () => {
        await installApp();
    };

    // Don't show if: already standalone, dismissed, or not installable
    if (isStandalone || dismissed || !isInstallable) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                    color: 'white',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    zIndex: 10000,
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
                }}
                role="banner"
                aria-label="Install app banner"
            >
                {/* App Logo */}
                <img
                    src="/logo.png"
                    alt="Oxford School App Logo"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0
                    }}
                />

                {/* Text Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                        Install Oxford School App
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                        Add to home screen for quick access
                    </div>
                </div>

                {/* Install Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleInstall}
                    style={{
                        background: 'white',
                        color: '#1a237e',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 14px',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    ⬇️ Install
                </motion.button>

                {/* Dismiss Button */}
                <button
                    onClick={() => setDismissed(true)}
                    aria-label="Dismiss install banner"
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        lineHeight: 1,
                        flexShrink: 0,
                    }}
                >
                    ×
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
```

**Usage in App Component:**

```typescript
// In src/App.tsx or your main layout
import InstallPromptBanner from './components/InstallPromptBanner';

export default function App() {
    return (
        <div>
            {/* Your app content */}
            <Routes>
                {/* ... */}
            </Routes>

            {/* Install banner - shown on all routes */}
            <InstallPromptBanner />
        </div>
    );
}
```

---

## Offline Sync Feature

### Offline Sync Hook

**File:** `src/hooks/useOfflineSync.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

// LocalStorage key for persistence
const QUEUE_KEY = 'attendance_offline_queue';

/**
 * Interface for queued API requests
 * Stored in localStorage when offline
 */
export interface QueuedAttendance {
    id: string;
    date: string;
    class?: string;
    academicYear: string;
    type: 'student' | 'staff';
    records: { studentId: string; status: string; timestamp: string }[];
    queuedAt: string;
}

/**
 * Load queue from localStorage
 */
function loadQueue(): QueuedAttendance[] {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * Persist queue to localStorage
 */
function saveQueue(queue: QueuedAttendance[]) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

let _queueIdCounter = 0;

/**
 * React Hook: Manage offline attendance sync
 * 
 * Features:
 * - Queue requests when offline
 * - Auto-sync when back online
 * - Persist queue to localStorage
 * - Retry failed syncs
 * 
 * Returns:
 * - isOnline: boolean
 * - queue: QueuedAttendance[]
 * - enqueue: Add request to queue
 * - syncAll: Manually sync all requests
 * - syncing: boolean - currently syncing
 * - pendingCount: number of queued requests
 */
export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queue, setQueue] = useState<QueuedAttendance[]>(loadQueue);
    const [syncing, setSyncing] = useState(false);

    // ─── Listen for Online/Offline Events ────────────────────────────────────
    useEffect(() => {
        const handleOnline = () => {
            console.log('App is online');
            setIsOnline(true);
        };
        const handleOffline = () => {
            console.log('App is offline');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ─── Queue a Request ────────────────────────────────────────────────────
    const enqueue = useCallback((payload: Omit<QueuedAttendance, 'id' | 'queuedAt'>) => {
        _queueIdCounter++;
        
        const item: QueuedAttendance = {
            ...payload,
            id: `${Date.now()}-${_queueIdCounter}-${Math.random().toString(36).slice(2)}`,
            queuedAt: new Date().toISOString(),
        };

        setQueue(prev => {
            const next = [...prev, item];
            saveQueue(next);  // Persist to localStorage
            return next;
        });

        console.log('Queued attendance:', item);
    }, []);

    // ─── Sync All Queued Requests ───────────────────────────────────────────
    const syncAll = useCallback(async () => {
        const current = loadQueue();
        
        if (current.length === 0) {
            return { synced: 0, failed: 0 };
        }

        setSyncing(true);
        let synced = 0;
        let failed = 0;
        const remaining: QueuedAttendance[] = [];

        for (const item of current) {
            try {
                console.log('Syncing:', item);
                
                // Send to backend
                await API.post('/attendance', {
                    date: item.date,
                    class: item.class,
                    academicYear: item.academicYear,
                    type: item.type,
                    records: item.records,
                });

                synced++;
                console.log('Successfully synced:', item.id);
            } catch (error) {
                failed++;
                remaining.push(item);
                console.error('Failed to sync:', item.id, error);
            }
        }

        // Update queue with only failed items
        saveQueue(remaining);
        setQueue(remaining);
        setSyncing(false);

        console.log(`Sync complete: ${synced} synced, ${failed} failed`);
        return { synced, failed };
    }, []);

    // ─── Auto-Sync When Coming Online ───────────────────────────────────────
    useEffect(() => {
        if (isOnline && loadQueue().length > 0) {
            console.log('Back online, syncing queued requests...');
            syncAll();
        }
    }, [isOnline, syncAll]);

    return {
        isOnline,
        queue,
        enqueue,
        syncAll,
        syncing,
        pendingCount: queue.length
    };
}
```

**Usage in Component:**

```typescript
import { useOfflineSync } from '../hooks/useOfflineSync';

export function AttendancePage() {
    const { isOnline, pendingCount, enqueue, syncing } = useOfflineSync();

    const handleSubmit = async (formData) => {
        if (isOnline) {
            // Send directly
            await API.post('/attendance', formData);
        } else {
            // Queue for later
            enqueue({
                date: formData.date,
                academicYear: formData.academicYear,
                type: 'student',
                records: formData.records,
            });
        }
    };

    return (
        <div>
            {!isOnline && (
                <div className="warning">
                    You are offline. {pendingCount} requests queued.
                    {syncing && <p>Syncing...</p>}
                </div>
            )}
            {/* Form */}
        </div>
    );
}
```

---

## Native App Wrappers (Android & iOS)

### Android WebView Wrapper

**File:** `android/WebViewActivity.kt`

```kotlin
package com.example.schoolfeemanagement

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * Android App that hosts the React web app in a WebView
 * 
 * Responsibilities:
 * 1. Load web app from production URL
 * 2. Enable JavaScript and localStorage
 * 3. Manage zoom settings (sync with web layer)
 * 4. Persist zoom preference in SharedPreferences
 */
class WebViewActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    // SharedPreferences key that mirrors web app's localStorage key
    private val PREFS_KEY_ZOOM = "zoomEnabled"
    private val PREFS_NAME = "AppPrefs"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_webview)

        webView = findViewById(R.id.webView)

        setupWebView()

        // Read persisted zoom preference (default: enabled)
        val zoomEnabled = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getBoolean(PREFS_KEY_ZOOM, true)

        configureZoom(zoomEnabled)

        // Load production web app
        webView.loadUrl("https://oxfordschool.cc")
    }

    /**
     * Configure WebView zoom controls and sync with web layer
     * 
     * @param enabled true = allow pinch-zoom, false = disable
     * @param notifyWeb false when called from web layer to avoid infinite loop
     */
    @SuppressLint("SetJavaScriptEnabled")
    fun configureZoom(enabled: Boolean, notifyWeb: Boolean = true) {
        val settings = webView.settings

        // Enable/disable native pinch-zoom gesture
        settings.setSupportZoom(enabled)
        settings.builtInZoomControls = enabled
        // Always hide the on-screen zoom buttons
        settings.displayZoomControls = false

        // Persist to SharedPreferences
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putBoolean(PREFS_KEY_ZOOM, enabled)
            .apply()

        if (notifyWeb) {
            // Notify web layer to update viewport meta tag and localStorage
            val js = """
                (function() {
                    window.postMessage({ type: 'zoom-change', enabled: $enabled }, '*');
                })();
            """.trimIndent()
            
            webView.evaluateJavascript(js, null)
        }
    }

    /**
     * Configure WebView settings
     */
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.apply {
            webViewClient = WebViewClient()

            settings.apply {
                javaScriptEnabled = true      // Required for React
                domStorageEnabled = true      // Required for localStorage
                allowFileAccess = false       // Security
                allowContentAccess = false    // Security
            }
        }
    }
}
```

**Activity Layout:** `android/res/layout/activity_webview.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</LinearLayout>
```

---

### iOS WebView Wrapper

**File:** `ios/WebViewController.swift`

```swift
import UIKit
import WebKit

/**
 * iOS App that hosts the React web app in a WKWebView
 * 
 * Responsibilities:
 * 1. Load web app from production URL
 * 2. Enable JavaScript and localStorage
 * 3. Manage zoom settings (sync with web layer)
 * 4. Persist zoom preference in UserDefaults
 */
class WebViewController: UIViewController {

    private var webView: WKWebView!
    
    // UserDefaults key that mirrors web app's localStorage key
    private let userDefaultsKeyZoom = "zoomEnabled"

    override func viewDidLoad() {
        super.viewDidLoad()

        setupWebView()

        // Read persisted zoom preference (default: enabled)
        let zoomEnabled = UserDefaults.standard.object(forKey: userDefaultsKeyZoom) as? Bool ?? true
        configureZoom(enabled: zoomEnabled)

        // Load production web app
        let url = URL(string: "https://oxfordschool.cc")!
        webView.load(URLRequest(url: url))
    }

    // MARK: - Setup

    /**
     * Initialize WKWebView with configuration
     */
    private func setupWebView() {
        let config = WKWebViewConfiguration()

        // Register message handler for web -> native communication
        config.userContentController.add(self, name: "zoomBridge")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self

        view.addSubview(webView)

        // Constrain to safe area (respects notch)
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }

    // MARK: - Zoom Control

    /**
     * Configure zoom settings and sync with web layer
     * 
     * @param enabled true = allow pinch-zoom, false = disable
     * @param notifyWeb false when called from web layer to avoid infinite loop
     */
    func configureZoom(enabled: Bool, notifyWeb: Bool = true) {
        // Toggle pinch gesture on scroll view
        webView.scrollView.pinchGestureRecognizer?.isEnabled = enabled

        // Persist to UserDefaults
        UserDefaults.standard.set(enabled, forKey: userDefaultsKeyZoom)

        if notifyWeb {
            // Notify web layer to update viewport meta tag and localStorage
            let js = """
            (function() {
                window.postMessage({ type: 'zoom-change', enabled: \(enabled) }, '*');
            })();
            """
            
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

// MARK: - WKNavigationDelegate

/**
 * Handle navigation events
 */
extension WebViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Re-apply zoom preference after page load
        let zoomEnabled = UserDefaults.standard.object(forKey: userDefaultsKeyZoom) as? Bool ?? true
        // notifyWeb: false because fresh page will handle zoom on its own
        configureZoom(enabled: zoomEnabled, notifyWeb: false)
    }
}

// MARK: - WKScriptMessageHandler

/**
 * Handle messages from web app (web -> native communication)
 */
extension WebViewController: WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "zoomBridge",
              let body = message.body as? [String: Any],
              let enabled = body["enabled"] as? Bool
        else { return }

        // notifyWeb: false because message came FROM the web
        configureZoom(enabled: enabled, notifyWeb: false)
    }
}
```

---

## Build & Deployment Process

### 1. Development Build

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server with PWA
npm run dev

# Open browser to http://localhost:5173
# You'll see the install banner (might not work in dev without HTTPS)
```

### 2. Production Build

```bash
# Build for production
npm run build

# This command:
# 1. Runs vite build
# 2. VitePWA plugin generates:
#    - workbox service worker (sw.js)
#    - manifest.json in dist/
#    - Optimized chunk files
# 3. Outputs to dist/ folder

# Build output structure:
# dist/
# ├── index.html
# ├── sw.js (service worker)
# ├── manifest.json
# ├── pwa-manifest-{hash}.json (backup)
# ├── assets/
# │   ├── index-{hash}.js (React bundle)
# │   ├── index-{hash}.css (Styles)
# │   └── vendor-{hash}.js (Dependencies)
# └── icons/
#     ├── icon-192.png
#     ├── icon-512.png
#     ├── maskable-192x192.png
#     └── maskable-512x512.png
```

### 3. Generate Required Icons

```bash
# Create icon files in public/ folder

# Option 1: Use online tool
# https://web-app-manifest-generator.netlify.app/

# Option 2: Use ImageMagick (CLI)
# Install: brew install imagemagick (macOS) or apt install imagemagick (Linux)

# Convert original image (512x512) to different sizes:
convert logo.png -resize 192x192 public/icons/icon-192.png
convert logo.png -resize 512x512 public/icons/icon-512.png

# Create maskable icons (adaptive icons for Android 13+)
# Ensure original has transparent padding (8% on all sides)
convert logo.png -resize 192x192 public/maskable-192x192.png
convert logo.png -resize 512x512 public/maskable-512x512.png

# Create home screen splash
convert logo.png -resize 512x512 public/pwa-512x512.png

# Apple touch icon
convert logo.png -resize 180x180 public/apple-touch-icon.png
```

### 4. Deploy to Production

```bash
# Option 1: Deploy with Vercel
npm install -g vercel
vercel

# Option 2: Deploy with Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist

# Option 3: Deploy to your own server
scp -r dist/* user@yourdomain.com:/var/www/yourdomain/

# Important: Configure server headers for PWA
```

### 5. Server Configuration (Nginx)

```nginx
# /etc/nginx/sites-available/oxfordschool.cc

server {
    listen 443 ssl http2;
    server_name oxfordschool.cc;

    ssl_certificate /etc/letsencrypt/live/oxfordschool.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oxfordschool.cc/privkey.pem;

    root /var/www/oxfordschool/dist;
    index index.html;

    # ─── PWA Service Worker ──────────────────────────────────────────────
    location /sw.js {
        add_header Service-Worker-Allowed /;
        add_header Cache-Control "public, max-age=0, must-revalidate";
        expires 0;
    }

    # ─── Manifest ────────────────────────────────────────────────────────
    location /manifest.json {
        add_header Cache-Control "public, max-age=3600";
        types { application/manifest+json json; }
    }

    # ─── Immutable Assets (CSS, JS, Images with hashes) ──────────────────
    location /assets {
        add_header Cache-Control "public, max-age=31536000, immutable";
        expires 365d;
    }

    # ─── HTML (Don't cache) ──────────────────────────────────────────────
    location ~* \.html$ {
        add_header Cache-Control "public, max-age=0, must-revalidate";
        expires 0;
    }

    # ─── SPA Routing (Fallback to index.html) ────────────────────────────
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ─── API Proxy to Backend ────────────────────────────────────────────
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name oxfordschool.cc;
    return 301 https://$server_name$request_uri;
}
```

### 6. Server Configuration (Apache)

```apache
# .htaccess in root directory

<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # ─── Service Worker ──────────────────────────────────────────────────
  <FilesMatch "^sw\.js$">
    Header set Service-Worker-Allowed /
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>
  
  # ─── Manifest ────────────────────────────────────────────────────────
  <FilesMatch "manifest\.json$">
    Header set Cache-Control "public, max-age=3600"
    Header set Content-Type "application/manifest+json"
  </FilesMatch>
  
  # ─── Immutable Assets ────────────────────────────────────────────────
  <FilesMatch "assets/.*\.(js|css|png|jpg|gif|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  
  # ─── HTML Files ──────────────────────────────────────────────────────
  <FilesMatch "\.html$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>
  
  # ─── SPA Routing ─────────────────────────────────────────────────────
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.html [L]
</IfModule>
```

---

## Complete Flow Diagram

### Build Process Flow

```
npm run build
     │
     ▼
Vite Build Process
     │
     ├─ Compile TypeScript → JavaScript
     │
     ├─ Bundle React Code
     │
     ├─ VitePWA Plugin Activates
     │  │
     │  ├─ Generate Service Worker
     │  │  └─ Uses Workbox
     │  │     └─ Creates caching strategies
     │  │
     │  ├─ Generate Manifest
     │  │  └─ From vite.config.js config
     │  │     └─ Writes to dist/manifest.json
     │  │
     │  └─ Copy Assets
     │     └─ Icons (192x192, 512x512, maskable)
     │
     ▼
dist/ Folder
     │
     ├─ index.html (entry point)
     ├─ sw.js (service worker)
     ├─ manifest.json (app metadata)
     ├─ assets/ (JS, CSS, images)
     └─ icons/ (app icons)
```

### Runtime Flow (First Visit)

```
User Visits https://oxfordschool.cc
     │
     ▼
Browser Downloads & Renders index.html
     │
     ▼
Loads React App from assets/
     │
     ▼
src/main.tsx Executes
     │
     ├─ Calls registerSW()
     │  │
     │  └─ Registers Service Worker (sw.js)
     │
     ├─ Renders React App
     │
     └─ Sets up message listeners
```

### Service Worker Lifecycle

```
Service Worker Registration
     │
     ▼
Install Event
     │
     ├─ Open cache named 'school-fee-mgmt-v1'
     │
     └─ Cache static assets
        ├─ /
        ├─ /index.html
        ├─ /manifest.json
        ├─ Icons
        └─ etc.
        
        ▼
        skipWaiting() ─── Activate immediately
     │
     ▼
Activate Event
     │
     ├─ Get list of all caches
     │
     └─ Delete caches NOT named 'school-fee-mgmt-v1'
        │
        ▼
        claim() ─── Take control of all clients
     │
     ▼
Ready for Fetch Events
```

### Install Flow

```
User Visits App
     │
     ▼
Browser Checks Requirements
     │
     ├─ ✓ HTTPS or localhost
     ├─ ✓ manifest.json present
     ├─ ✓ Service worker registered
     ├─ ✓ Icons present
     └─ ✓ Not already installed
     │
     ▼
Fires beforeinstallprompt Event
     │
     ▼
usePWA Hook Captures It
     │
     ▼
InstallPromptBanner Appears
     │
     ▼
User Clicks "Install"
     │
     ▼
installApp() Calls prompt()
     │
     ▼
OS Shows Install Dialog
     │
     ├─ User Accepts ─────────────────┐
     │                                 │
     │                                 ▼
     │                         App Added to Home Screen
     │                                 │
     │                                 ▼
     │                         Opening App Runs in 'standalone' Mode
     │                         (display-mode: standalone)
     │
     └─ User Dismisses ───────────────┐
                                       │
                                       ▼
                                 Dismiss Flag Set
                                       │
                                       ▼
                                 Banner Hidden
```

### Offline Sync Flow

```
User Makes Attendance Entry
     │
     ▼
Check navigator.onLine
     │
     ├─ Online ──────────┐
     │                   │
     │                   ▼
     │          Send to Backend (API)
     │                   │
     │                   ▼
     │          Update UI with Response
     │
     └─ Offline ────────────┐
                            │
                            ▼
               useOfflineSync.enqueue()
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
            Generate   Store in  Update
            Unique ID  localStorage Queue State
                │
                ▼
            User Sees "Offline Mode"
            Message
                │
        User Comes Online
                │
                ▼
            useOfflineSync Detects
            'online' Event
                │
                ▼
            syncAll() Executes
                │
                ├─ Load Queue from localStorage
                │
                ├─ For Each Item:
                │  │
                │  ├─ Send API Request
                │  │  │
                │  │  ├─ Success ──── Remove from Queue
                │  │  │
                │  │  └─ Fail ─────── Keep in Queue
                │  │
                │  └─ Update UI
                │
                └─ Save Updated Queue
                   (only with failed items)
```

---

## Checklist for Implementation

- [ ] Install `vite-plugin-pwa` package
- [ ] Create `vite.config.js` with PWA configuration
- [ ] Create `public/manifest.json` with app metadata
- [ ] Create `public/sw.js` with service worker logic
- [ ] Create `src/hooks/usePWA.ts` for install prompts
- [ ] Create `src/components/InstallPromptBanner.tsx`
- [ ] Create `src/hooks/useOfflineSync.ts` for offline queueing
- [ ] Update `src/main.tsx` to register service worker
- [ ] Add PWA meta tags to `index.html`
- [ ] Generate icon files (192x192, 512x512, maskable versions)
- [ ] Test on mobile/emulator
- [ ] Deploy to production with HTTPS
- [ ] Configure server caching headers
- [ ] Test installation on real device
- [ ] Verify offline functionality
- [ ] Test offline sync

---

## Testing Checklist

### Browser DevTools Testing

```javascript
// In console on your app

// 1. Check if SW is registered
navigator.serviceWorker.getRegistrations()
  .then(registrations => console.log(registrations))

// 2. Check if app is installable
// Should see "Install" button on page

// 3. Check if offline
navigator.onLine  // Should be true/false

// 4. Check localStorage for offline queue
JSON.parse(localStorage.getItem('attendance_offline_queue'))

// 5. Simulate offline
// DevTools > Network > Offline checkbox

// 6. Check cache storage
// DevTools > Application > Cache Storage > school-fee-mgmt-v1
```

### Mobile Testing

1. **Android Chrome:**
   - Visit app on HTTPS domain
   - See install banner at bottom
   - Click install
   - App appears on home screen
   - Open installed app
   - Should run in full screen (no browser UI)

2. **iOS Safari:**
   - Visit app on HTTPS domain
   - Tap Share button
   - Select "Add to Home Screen"
   - App appears on home screen
   - Open installed app
   - Should run in full screen (no browser UI)

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Install banner not showing | Not HTTPS or SW not registered | Use HTTPS, check SW registration |
| SW not updating | Browser cache | Manually refresh with Cmd+Shift+R |
| Offline mode not working | SW not caching assets | Check cache in DevTools |
| Manifest not found | Path incorrect | Ensure `<link rel="manifest" href="/manifest.json">` in HTML |
| Icons not showing | Wrong paths | Icons must be in `public/` folder |
| App crashes offline | API calls not queued | Use `useOfflineSync` hook |
| Zoom sync not working | Native layer doesn't have zoom function | Implement `configureZoom()` in native code |

---

## Summary

This PWA implementation provides:

✅ **Installation** - Users can install app to home screen  
✅ **Offline Support** - Service worker caches assets  
✅ **Automatic Updates** - SW updates without user action  
✅ **Offline Sync** - Queue API calls when offline, sync when online  
✅ **Native Integration** - Android & iOS WebView wrappers  
✅ **Zoom Control** - Sync zoom between native and web  
✅ **SEO Optimized** - Proper meta tags and schema  

The entire system is production-ready and can be deployed to any HTTPS server.
