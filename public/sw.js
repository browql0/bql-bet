// Service Worker for Academic Prediction Platform
const CACHE_NAME = 'predictions-v1'
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS)
        })
    )
    self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name)
                    }
                })
            )
        })
    )
    self.clients.claim()
})

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return

    // Skip Supabase API calls (always need fresh data)
    if (event.request.url.includes('supabase.co')) return

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and cache successful responses
                if (response.ok) {
                    const responseClone = response.clone()
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone)
                    })
                }
                return response
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse
                    }
                    // For navigation requests, return index.html
                    if (event.request.mode === 'navigate') {
                        return caches.match('/')
                    }
                })
            })
    )
})
