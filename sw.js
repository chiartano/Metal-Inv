const CACHE_NAME = 'metalinv-v1';
const URLS_TO_CACHE = [
  '/MetalINV/',
  '/MetalINV/index.html',
  '/MetalINV/manifest.json',
  '/MetalINV/sw.js'
];

// Instalar SW y cachear recursos
self.addEventListener('install', event => {
  console.log('[SW] Instalando MetalINV...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando recursos...');
        return cache.addAll(URLS_TO_CACHE).catch(err => {
          console.log('[SW] Algunos recursos no se pudieron cachear (ok para desarrollo):', err);
          return cache.addAll(['/MetalINV/', '/MetalINV/manifest.json']);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activar y limpiar caches viejos
self.addEventListener('activate', event => {
  console.log('[SW] Activando MetalINV...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: Network first, fallback a cache
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo cachear requests de nuestro dominio
  if (!url.pathname.includes('/MetalINV/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cachear respuestas exitosas
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // Fallback a cache si no hay conexión
        return caches.match(request)
          .then(response => {
            if (response) {
              console.log('[SW] Sirviendo desde cache:', request.url);
              return response;
            }
            // Si no está en cache, servir página offline (aquí sirve la app mismo)
            return caches.match('/MetalINV/');
          });
      })
  );
});

// Mensaje desde el cliente para actualizar
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
