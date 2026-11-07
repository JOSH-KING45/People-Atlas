/* The offline cache contains only public workspace shells and build files. */
const CACHE = 'people-atlas-guest-shell-v1';
const GUEST = '/guest';
const OFFLINE_ATLAS = '/offline-atlas';
const preparations = new Map();

function isBuildAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/_next/static/');
}

async function prepareShell(path) {
  const response = await fetch(path, {
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    headers: { Accept: 'text/html' },
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
    throw new Error('Offline workspace could not be downloaded.');
  }

  const html = await response.clone().text();
  const assets = new Set();
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const url = new URL(match[1], self.location.origin);
    if (isBuildAsset(url)) assets.add(url.href);
  }
  if (!assets.size) throw new Error('Offline workspace assets could not be found.');

  const cache = await caches.open(CACHE);
  const missing = (await Promise.all([...assets].map(async url => {
    return await cache.match(url) ? null : new Request(url, { credentials: 'omit', redirect: 'error' });
  }))).filter(Boolean);
  await cache.addAll(missing);
  // Keep the previous shell usable if any of the new files fails to download.
  await cache.put(path, response);
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (!event.source || !event.ports[0]) return;
  const source = new URL(event.source.url).pathname;
  const path = event.data === 'prepare-guest' && source === GUEST ? GUEST :
    event.data === 'prepare-offline-atlas' && source === '/atlas' ? OFFLINE_ATLAS : null;
  if (!path) return;
  const reply = event.ports[0];
  if (!preparations.has(path)) {
    preparations.set(path, prepareShell(path).finally(() => preparations.delete(path)));
  }
  event.waitUntil(preparations.get(path).then(
    () => reply.postMessage(true),
    async () => reply.postMessage(Boolean(await caches.match(path, { cacheName: CACHE }))),
  ));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' && [GUEST, '/', '/atlas', OFFLINE_ATLAS].includes(url.pathname)) {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      if (url.pathname === '/') {
        for (const path of [OFFLINE_ATLAS, GUEST]) {
          if (await cache.match(path)) return Response.redirect(new URL(path, url.origin), 302);
        }
        return Response.error();
      }
      const path = url.pathname === '/atlas' ? OFFLINE_ATLAS : url.pathname;
      const shell = await cache.match(path);
      if (!shell) return Response.error();
      return path === url.pathname ? shell : Response.redirect(new URL(path, url.origin), 302);
    }));
  } else if (isBuildAsset(url)) {
    event.respondWith(caches.match(request, { cacheName: CACHE }).then(cached => cached || fetch(request)));
  }
});
