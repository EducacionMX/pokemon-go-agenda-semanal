const PREFIX = 'pokeweek-';
const CACHE = PREFIX + 'v3.4.0-mobile';
const ROOT = new URL(self.registration.scope);
const DATA = new URL('data/events.normalized.json', ROOT);
const SHELL = [
 './', 'compartir.html', 'share.js', 'assets/yuli-master-pokemon-preview.jpg', 'styles.css', 'app.js', 'manifest.webmanifest',
 'data/events.normalized.json', 'assets/pokeball.svg', 'assets/pokeball.png', 'assets/pokeball-512.png', 'assets/eevee.png', 'assets/nunito.woff2'
];

async function getCache() {
 try { return await caches.open(CACHE); }
 catch { return null; }
}

async function cachedResponse(cache, key) {
 try { return await cache?.match(key); }
 catch { return undefined; }
}

async function rememberResponse(cache, key, response) {
 try {
  if (cache) await cache.put(key, response.clone());
 } catch { /* A full or unavailable cache must not block a network response. */ }
}

self.addEventListener('install', event => {
 event.waitUntil((async () => {
  const cache = await getCache();
  if (cache) {
   try {
    await cache.addAll(SHELL.map(path => new Request(new URL(path, ROOT), {cache: 'reload'})));
   } catch (error) {
    if (!['QuotaExceededError', 'SecurityError', 'InvalidStateError'].includes(error.name)) throw error;
   }
  }
  await self.skipWaiting();
 })());
});

self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  const cache = await getCache();
  if (await cachedResponse(cache, ROOT.href)) {
   try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
   } catch { /* Cleanup is optional when storage is unavailable. */ }
  }
  await self.clients.claim();
 })());
});

async function loadAgenda(request) {
 const cache = await getCache();
 try {
  const response = await fetch(request);
  if (!response.ok) throw new Error('Agenda: ' + response.status);
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) await rememberResponse(cache, DATA.href, response);
  return response;
 } catch (error) {
  const saved = await cachedResponse(cache, DATA.href);
  if (!saved) throw error;
  return new Response(await saved.blob(), {headers: {
   'Content-Type': 'application/json', 'X-PokeWeek-Offline': '1'
  }});
 }
}

async function loadAsset(request, key) {
 const cache = await getCache();
 const saved = await cachedResponse(cache, key);
 if (saved) return saved;
 const response = await fetch(request);
 if (response.ok) await rememberResponse(cache, key, response);
 return response;
}

self.addEventListener('fetch', event => {
 const {request} = event;
 if (request.method !== 'GET') return;
 const url = new URL(request.url);
 if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
 if (url.pathname === DATA.pathname) {
  event.respondWith(loadAgenda(request));
 } else {
  const isAgendaPage = request.mode === 'navigate' &&
   (url.pathname === ROOT.pathname || url.pathname === new URL('index.html', ROOT).pathname);
  event.respondWith(loadAsset(request, isAgendaPage ? ROOT.href : request));
 }
});
