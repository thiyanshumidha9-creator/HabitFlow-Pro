/* ============================================
   HabitFlow Pro — Service Worker
   ============================================
   Foundation for offline support, caching strategies,
   and installability checks.
   ============================================ */

const CACHE_NAME = 'habitflow-v7';
const API_CACHE_NAME = 'habitflow-api-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './404.html',
  './manifest.json',
  './app.js',
  './styles/main.css',
  './styles/variables.css',
  './styles/reset.css',
  './styles/typography.css',
  './styles/grid.css',
  './styles/utilities.css',
  './styles/components/sidebar.css',
  './styles/components/topnav.css',
  './styles/components/footer.css',
  './styles/components/card.css',
  './styles/components/button.css',
  './styles/components/input.css',
  './styles/components/modal.css',
  './styles/components/toast.css',
  './styles/components/loader.css',
  './styles/components/empty-state.css',
  './styles/components/error-boundary.css',
  './styles/components/analytics.css',
  './styles/components/sprint5.css',
  './styles/components/sprint6.css',
  './styles/components/profile-completion.css',
  './utils/dom.js',
  './utils/theme.js',
  './utils/icons.js',
  './utils/router.js',
  './services/token-service.js',
  './services/api.js',
  './services/validation.js',
  './services/auth-service.js',
  './services/settings-service.js',
  './services/data-service.js',
  './services/offline-service.js',
  './layouts/app-layout.js',
  './components/sidebar.js',
  './components/topnav.js',
  './components/footer.js',
  './components/card.js',
  './components/button.js',
  './components/input.js',
  './components/modal.js',
  './components/toast.js',
  './components/loader.js',
  './components/empty-state.js',
  './components/error-boundary.js',
  './components/auth-components.js',
  './pages/dashboard.js',
  './pages/habits.js',
  './pages/calendar.js',
  './pages/analytics.js',
  './pages/journal.js',
  './pages/achievements.js',
  './pages/settings.js',
  './pages/login.js',
  './pages/signup.js',
  './pages/forgot-password.js',
  './pages/reset-password.js',
  './pages/profile.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-192-maskable.svg',
  './icons/icon-512-maskable.svg'
];

// Install Event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Service Worker] Some assets could not be cached on install:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== API_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: network first falling back to cache strategy (good for dev/updates)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Cache authenticated API GET responses separately; the frontend also keeps a local payload cache.
  if (url.pathname.startsWith('/api/v1/')) {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) caches.open(API_CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request).then(hit => hit || new Response(JSON.stringify({ success:false, message:'Offline data is unavailable.' }), { status:503, headers:{'Content-Type':'application/json'} }))));
    return;
  }

  // Skip cross-origin or CDN scripts like unpkg
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response to put in cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is down
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If offline and request is index/navigation, return cached index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline: Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});
