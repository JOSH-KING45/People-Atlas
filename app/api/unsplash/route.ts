import { api, ApiError, body, json, owner } from '@/lib/server';
import { unsplashCredit, unsplashImage, unsplashPhotoId, unsplashUrl } from '@/lib/unsplash';

export function POST(request: Request) {
  return api(async () => {
    await owner();
    const { link } = await body(request, 2048);
    const id = typeof link === 'string' && unsplashPhotoId(link.trim());
    if (!id) throw new ApiError(400, 'Paste an Unsplash photo page link.');
    const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
    if (!key) throw new ApiError(503, 'Direct selection is unavailable. Download a photo from Unsplash and use the picture uploader.');
    const headers = { Authorization: 'Client-ID ' + key, 'Accept-Version': 'v1' };
    const get = (url: string) => fetch(url, { headers, signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store' });
    const response = await get('https://api.unsplash.com/photos/' + id);
    if (!response.ok) throw new ApiError(response.status === 404 ? 404 : 502, 'Unsplash could not load that photo.');
    const photo = await response.json();
    const image = unsplashImage(photo.urls?.regular);
    const author = typeof photo.user?.name === 'string' && photo.user.name.trim().slice(0, 120);
    const credit = unsplashCredit(photo.user?.links?.html);
    const download = unsplashUrl(photo.links?.download_location, 'https://api.unsplash.com');
    if (!image || !author || !credit || !download || new URL(download).pathname !== '/photos/' + id + '/download') {
      throw new ApiError(502, 'Unsplash returned incomplete photo details.');
    }
    if (!(await get(download)).ok) throw new ApiError(502, 'Unsplash could not register the photo selection. Try again.');
    return json({ image, author, credit });
  });
}
