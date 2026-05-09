// ─────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER - Handles caching, offline support, and background sync
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'siara-dental-v1';

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
    // console.log('[SW] Fetch:', event.request.url);

    event.respondWith(
        // 1. Try to get from cache first
        caches.match(event.request).then((cached) => {
            if (cached) {
                // console.log('[SW] Serving from cache:', event.request.url);
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
                    // console.log('[SW] Caching response:', event.request.url);
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
