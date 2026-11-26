const CACHE = 'amin-offline-v1';
const PRE = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&family=Amiri:wght@400;700&family=Amiri+Quran&display=swap',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap'
];
const LIB_HOSTS = ['www.gstatic.com', 'fonts.gstatic.com', 'fonts.googleapis.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for(const u of ['./index.html', './']){
      try{ const r = await fetch(new Request(u, {cache: 'reload'})); if(r && r.ok) await c.put(u, r); }catch(_){}
    }
    await Promise.all(PRE.map(async u => {
      try{ const req = new Request(u, {mode: 'no-cors'}); const r = await fetch(req); await c.put(req, r); }catch(_){}
    }));
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(req){
  const c = await caches.open(CACHE);
  try{
    const r = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 5000))]);
    if(r && r.ok) c.put(req, r.clone());
    return r;
  }catch(_){
    const hit = await c.match(req, {ignoreSearch: true});
    if(hit) return hit;
    if(req.mode === 'navigate'){ const home = (await c.match('./index.html')) || (await c.match('./')); if(home) return home; }
    return Response.error();
  }
}
async function cacheFirst(req){
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if(hit) return hit;
  try{ const r = await fetch(req); if(r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }
  catch(_){ return Response.error(); }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  let url; try{ url = new URL(req.url); }catch(_){ return; }
  if(url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if(url.origin === location.origin){ e.respondWith(networkFirst(req)); return; }
  if(LIB_HOSTS.indexOf(url.hostname) >= 0) e.respondWith(cacheFirst(req));
});
