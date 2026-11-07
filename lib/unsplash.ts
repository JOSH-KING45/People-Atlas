export function unsplashPhotoId(value: string) {
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  if (url.origin !== 'https://unsplash.com' || url.username || url.password) return null;
  return url.pathname.match(/^\/(?:[a-z]{2}\/)?photos\/(?:[a-z0-9-]+-)?([A-Za-z0-9_-]{11})\/?$/i)?.[1] ?? null;
}

export function unsplashUrl(value: unknown, origin: string) {
  if (typeof value !== 'string' || value.length > 1500 || !URL.canParse(value)) return '';
  const url = new URL(value);
  return url.origin === origin && !url.username && !url.password ? url.href : '';
}

export function unsplashImage(value: unknown) {
  return unsplashUrl(value, 'https://images.unsplash.com').replace(/["()\\]/g, character => encodeURIComponent(character));
}

export function unsplashCredit(value: unknown) {
  const href = unsplashUrl(value, 'https://unsplash.com');
  if (!href) return '';
  const url = new URL(href);
  url.searchParams.set('utm_source', 'people_atlas');
  url.searchParams.set('utm_medium', 'referral');
  return url.href;
}
