/* Service Worker — شرف ERP (PWA) — وضع عدم الاتصال الكامل
   Policy:
   1) Navigation: network-first مع fallback إلى الصفحة المخزنة (تعمل دون إنترنت).
   2) كل الأصول الثابتة (js/css/woff/صور): cache-first ثم تحديث من الشبكة بال خلفية.
   3) الطلبات الخارجية (GitHub API/أخرى): تمر كما هي — قاعدة بيانات IndexedDB محلية أصلًا.
   4) كل استجابة ناجحة تُحفظ في الكاش لاستخدامها عند انقطاع الشبكة.
*/
const CACHE_NAME = 'sharaf-erp-v2';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/sw.js',
  '/icon-192.png',
  '/icon-512.png'
];

// ترقية قشر النظام كاملًا بعد التثبيت (كل js/css من index.html المنشور)
async function precacheShell() {
  try {
    const indexRes = await fetch('/');
    if (!indexRes.ok) return;
    const html = await indexRes.text();
    const assets = ['/'];
    const mjs = html.match(/src="[^"]+\.js[^"]*"/g) || [];
    const css = html.match(/href="[^"]+\.css[^"]*"/g) || [];
    mjs.forEach((s) => assets.push(s.replace(/^src="|"\s*$/g, '')));
    css.forEach((s) => assets.push(s.replace(/^href="|"\s*$/g, '')));
    const cache = await caches.open(CACHE_NAME);
    await cache.put('/', new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
    for (const a of assets) {
      if (a.startsWith('/')) {
        try { const r = await fetch(a); if (r.ok) await cache.put(a, r.clone()); } catch {}
      }
    }
  } catch {}
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(precacheShell());
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
  // الطلبات غير نفس النطاق أو POST (مزامنة): نتركها تمر
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fromNetwork = fetch(e.request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => null);

      return fromNetwork.then((net) => {
        if (net) return net;
        if (cached) return cached;
        // آخر محاولة: إذا طلب التنقل الرئيسي فاشل وكل شيء فاشل، أعد الصفحة المخزنة من أي مسار
        if (e.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
