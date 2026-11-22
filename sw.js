const PREFIX = 'pokeweek-';
const CACHE = PREFIX + 'v3.3.0-countdown';
const ROOT = new URL(self.registration.scope);
const DATA = new URL('data/events.normalized.json', ROOT);
const SHELL = [
 './', 'compartir.html', 'share.js', 'assets/yuli-master-pokemon-preview.jpg', 'styles.css', 'app.js', 'push-config.js', 'manifest.webmanifest',
 'data/events.normalized.json', 'assets/pokeball.svg', 'assets/pokeball.png', 'assets/pokeball-512.png', 'assets/eevee.png', 'assets/nunito.woff2'
];

self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => {
  return cache.addAll(SHELL.map(path => new Request(new URL(path, ROOT), {cache: 'reload'})));
 }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(
  keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
 )).then(() => self.clients.claim()));
});

async function loadAgenda(request) {
 const cache = await caches.open(CACHE);
 try {
  const response = await fetch(request);
  if (!response.ok) throw new Error('Agenda: ' + response.status);
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) await cache.put(DATA.href, response.clone());
  return response;
 } catch (error) {
  const saved = await cache.match(DATA.href);
  if (!saved) throw error;
  return new Response(await saved.blob(), {headers: {
   'Content-Type': 'application/json', 'X-PokeWeek-Offline': '1'
  }});
 }
}

async function loadAsset(request, key) {
 const cache = await caches.open(CACHE);
 const saved = await cache.match(key);
 if (saved) return saved;
 const response = await fetch(request);
 if (response.ok) await cache.put(key, response.clone());
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

self.addEventListener('push', event => {
 let message;
 try { message = event.data?.json(); }
 catch { message = {body: event.data?.text()}; }
 event.waitUntil(self.registration.showNotification(message?.title || '🔔 Pokémon GO', {
  body: message?.body || 'Tienes un evento próximo',
  icon: new URL('assets/pokeball.png', ROOT).href,
  badge: new URL('assets/pokeball.png', ROOT).href,
  tag: message?.tag,
  data: message?.url || ROOT.href
 }));
});

self.addEventListener('notificationclick', event => {
 event.notification.close();
 let destination = ROOT;
 try {
  const url = new URL(event.notification.data || ROOT, ROOT);
  if (url.origin === ROOT.origin && url.pathname.startsWith(ROOT.pathname)) destination = url;
 } catch {}
 event.waitUntil(clients.openWindow(destination.href));
});
