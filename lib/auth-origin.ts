export function authOrigin() {
  const configured = process.env.APP_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '');
  const url = new URL(configured);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost'))) {
    throw new Error('Configure APP_URL as the application origin.');
  }
  return url.origin;
}
