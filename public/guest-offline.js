/* The offline cache contains only the anonymous Guest shell and public build files. */
const CACHE = 'people-atlas-guest-shell-v1';
const GUEST = '/guest';
let preparation;

function isBuildAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/_next/static/');
}

async function prepareGuest() {
  const response = await fetch(GUEST, {
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    headers: { Accept: 'text/html' },
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
    throw new Error('Guest workspace could not be downloaded.');
  }

  const html = await response.clone().text();
  const assets = new Set();
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const url = new URL(match[1], self.location.origin);
    if (isBuildAsset(url)) assets.add(url.href);
  }
  if (!assets.size) throw new Error('Guest workspace assets could not be found.');

  const cache = await caches.open(CACHE);
  const missing = (await Promise.all([...assets].map(async url => {
    return await cache.match(url) ? null : new Request(url, { credentials: 'omit', redirect: 'error' });
  }))).filter(Boolean);
  await cache.addAll(missing);
  // Keep the previous shell usable if any of the new files fails to download.
  await cache.put(GUEST, response);
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (event.data !== 'prepare-guest' || !event.source ||
      new URL(event.source.url).pathname !== GUEST || !event.ports[0]) return;
  const reply = event.ports[0];
  preparation ??= prepareGuest().finally(() => { preparation = undefined; });
  event.waitUntil(preparation.then(
    () => reply.postMessage(true),
    async () => reply.postMessage(Boolean(await caches.match(GUEST, { cacheName: CACHE }))),
  ));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' && (url.pathname === GUEST || url.pathname === '/')) {
    event.respondWith(fetch(request).catch(async () => {
      const guest = await caches.match(GUEST, { cacheName: CACHE });
      if (!guest) return Response.error();
      return url.pathname === GUEST ? guest : Response.redirect(new URL(GUEST, url.origin), 302);
    }));
  } else if (isBuildAsset(url)) {
    event.respondWith(caches.match(request, { cacheName: CACHE }).then(cached => cached || fetch(request)));
  }
});
