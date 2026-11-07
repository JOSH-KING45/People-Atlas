'use client';

import { useEffect, useState } from 'react';

export function GuestOfflineStatus() {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let active = true;
    let port: MessagePort | undefined;
    async function prepare() {
      setOnline(navigator.onLine);
      try {
        await navigator.serviceWorker.register('/guest-offline.js');
        const registration = await navigator.serviceWorker.ready;
        if (!active || !registration.active) return;
        port?.close();
        const channel = new MessageChannel();
        port = channel.port1;
        port.onmessage = event => {
          if (active) setReady(event.data === true);
          channel.port1.close();
        };
        registration.active.postMessage('prepare-guest', [channel.port2]);
      } catch {
        // Guest data remains available for the current session.
      }
    }
    const markOffline = () => setOnline(false);
    void prepare();
    window.addEventListener('online', prepare);
    window.addEventListener('offline', markOffline);
    return () => {
      active = false;
      port?.close();
      window.removeEventListener('online', prepare);
      window.removeEventListener('offline', markOffline);
    };
  }, []);

  return <span aria-live="polite">{!online ? ' · Offline' : ready ? ' · Offline ready' : ''}</span>;
}
