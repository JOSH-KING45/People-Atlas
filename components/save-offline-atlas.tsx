'use client';

import { useState, type FormEvent } from 'react';
import { apiRequest, listRecords } from '@/lib/api-client';
import { hasOfflineAtlas, prepareOfflineAtlas, saveOfflineAtlas } from '@/lib/offline-atlas';
import type { Person } from '@/lib/people';

export function SaveOfflineAtlas({ accountId }: { accountId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const passphrase = String(new FormData(form).get('passphrase'));
    setBusy(true);
    setMessage('');
    try {
      if (hasOfflineAtlas() && !window.confirm('Replace the existing offline copy in this browser?')) return;
      const people = await listRecords<Person>(url => apiRequest(url, {
        cache: 'no-store', headers: { 'x-atlas-offline-owner': accountId },
      }), 'people');
      await prepareOfflineAtlas();
      await saveOfflineAtlas(people, passphrase);
      form.reset();
      setMessage('Offline copy saved. Keep your passphrase somewhere safe.');
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === 'QuotaExceededError'
        ? 'This copy is too large for the browser’s offline storage.'
        : error instanceof Error ? error.message : 'Could not save an offline copy.');
    } finally { setBusy(false); }
  }
  return <details className="panel spaced">
    <summary>Offline access</summary>
    <p>Save an encrypted, read-only copy of your profiles and notes on this device. Use a separate passphrase of at least 12 characters. The copy stays here until you remove or replace it.</p>
    <form onSubmit={save}>
      <label className="field">Offline passphrase<input name="passphrase" type="password" minLength={12} maxLength={200} autoComplete="new-password" required disabled={busy} /></label>
      <button className="outline-button spaced" disabled={busy}>{busy ? 'Preparing offline copy…' : 'Save offline copy'}</button>
    </form>
    <a className="text-button" href="/offline-atlas">Open or remove offline copy</a>
    {message && <p role="status">{message}</p>}
  </details>;
}
