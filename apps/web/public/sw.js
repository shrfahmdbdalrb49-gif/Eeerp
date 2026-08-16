/* Service Worker — شرف ERP (PWA)
   Strategy: network-first for navigation (نحتاج أحدث نسخة من الكود)،
   مع تخزين قشر الأساسيات (shell) للعمل عند انقطاع الشبكة.
   البيانات نفسها في IndexedDB فلا تحتاج كاشًا للمحتوى. */
const CACHE_NAME = 'sharaf-erp-v1';
const SHELL = [
  '/Eeerp/',
  '/Eeerp/assets/manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // لا نتعامل مع طلبات غير نفس النطاق
  if (url.origin !== self.location.origin) return;
  // التنقل (صفحات): network-first مع fallback للكاش
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/Eeerp/', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/Eeerp/'))
    );
    return;
  }
  // الأصول الثابتة (js/css/صور): كاش أولاً مع تحديث من الشبكة في الخلفية
  if (/\.(js|css|png|svg|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const net = fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
  }
});
