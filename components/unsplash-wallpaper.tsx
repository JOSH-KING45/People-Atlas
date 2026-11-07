'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api-client';

export default function UnsplashWallpaper({ direct, disabled, select }: {
  direct: boolean;
  disabled: boolean;
  select: (photo: { image: string; author: string; credit: string }) => Promise<void>;
}) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return <div className="spaced">
    <a href="https://unsplash.com/?utm_source=people_atlas&utm_medium=referral" target="_blank" rel="noreferrer">Browse Unsplash</a>
    {direct ? <form onSubmit={async event => {
      event.preventDefault();
      setBusy(true);
      setError('');
      try {
        const { image, author, credit } = await apiRequest('/api/unsplash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ link }),
        });
        await select({ image, author, credit });
        setLink('');
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Unable to select that photo.');
      } finally {
        setBusy(false);
      }
    }}>
      <label className="field">Unsplash photo link
        <input type="url" maxLength={1500} value={link} onChange={event => setLink(event.target.value)} required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button className="outline-button spaced" disabled={disabled || busy}>{busy ? 'Selecting…' : 'Use as dashboard picture'}</button>
    </form> : <p className="muted">Download your chosen photo and use Upload dashboard picture to crop and apply it.</p>}
  </div>;
}
