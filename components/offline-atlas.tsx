'use client';

import { useState, type FormEvent } from 'react';
import { unlockOfflineAtlas, removeOfflineAtlas } from '@/lib/offline-atlas';

export default function OfflineAtlas() {
  const [copy, setCopy] = useState<Awaited<ReturnType<typeof unlockOfflineAtlas>>>();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const passphrase = String(new FormData(form).get('passphrase'));
    form.reset();
    setBusy(true);
    setError('');
    try { setCopy(await unlockOfflineAtlas(passphrase)); }
    catch { setError('Could not unlock this copy. Check your passphrase or save a new copy from your signed-in Atlas.'); }
    finally { setBusy(false); }
  }
  return <main className="atlas-legal">
    <nav aria-label="People Atlas"><a href="/atlas">Online Atlas</a> · <a href="/guest">Guest workspace</a></nav>
    <h1>Offline Atlas</h1>
    <p>This is a read-only copy of your saved profiles. Connect to the internet to make changes.</p>
    {copy ? <>
      <p>Saved {new Date(copy.savedAt).toLocaleString()} · {copy.people.length} profiles</p>
      <button type="button" className="outline-button" onClick={() => { setCopy(undefined); setSearch(''); }}>Lock offline copy</button>
      <label className="field spaced">Search profiles and notes<input value={search} onChange={e => setSearch(e.target.value)} type="search" /></label>
      {copy.people.filter(person => [person.name, person.notes, ...Object.entries(person.fields).flat()].some(value =>
        value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
      )).map(person => <details key={person.id} className="panel spaced">
        <summary>{person.name}</summary>
        <dl>{Object.entries(person.fields).map(([label, value]) => <div key={label}><dt><strong>{label}</strong></dt><dd>{value}</dd></div>)}</dl>
        {person.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{person.notes}</p>}
      </details>)}
    </> : <form onSubmit={unlock}>
      <label className="field">Offline passphrase<input name="passphrase" type="password" required maxLength={200} autoComplete="off" /></label>
      <button className="primary-button spaced" disabled={busy}>{busy ? 'Unlocking…' : 'Unlock offline copy'}</button>
    </form>}
    {error && <p role="alert">{error}</p>}
    <button className="text-button spaced" onClick={async () => {
      if (window.confirm('Remove the offline copy from this browser?')) {
        await removeOfflineAtlas().catch(() => {});
        setCopy(undefined);
        setSearch('');
        setError('Offline copy removed from this device.');
      }
    }}>Remove offline copy</button>
  </main>;
}
