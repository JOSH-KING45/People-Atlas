'use client';

import { useState, type FormEvent } from 'react';
import { apiRequest, RequestError } from '@/lib/api-client';

export default function DeleteAccountForm() {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmation !== 'DELETE') return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      window.location.replace('/');
    } catch (failure) {
      setError(failure instanceof RequestError && [409, 503].includes(failure.status) ? failure.message : 'Account deletion could not be confirmed. Try again or sign in to check your account.');
      setBusy(false);
    }
  }

  return <form onSubmit={submit}>
    {error && <p role="alert">{error}</p>}
    <label className="field">Type DELETE to confirm
      <input value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" disabled={busy} required />
    </label>
    <button type="submit" className="outline-button spaced" disabled={busy || confirmation !== 'DELETE'}>
      {busy ? 'Deleting account…' : 'Permanently delete my account'}
    </button>
  </form>;
}
