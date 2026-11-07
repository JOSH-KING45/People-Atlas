import type { Person } from './people';

export const OFFLINE_ATLAS_PATH = '/offline-atlas';
const STORAGE_KEY = 'people-atlas-offline-copy-v1';
const encoder = new TextEncoder();

type OfflineCopy = { savedAt: string; people: Pick<Person, 'id' | 'name' | 'fields' | 'notes'>[] };

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

export function hasOfflineAtlas() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export async function removeOfflineAtlas() {
  localStorage.removeItem(STORAGE_KEY);
  if ('caches' in window) await (await caches.open('people-atlas-guest-shell-v1')).delete(OFFLINE_ATLAS_PATH);
}

export async function saveOfflineAtlas(people: Person[], passphrase: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const copy: OfflineCopy = {
    savedAt: new Date().toISOString(),
    people: people.map(({ id, name, fields, notes }) => ({ id, name, fields, notes })),
  };
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(copy)));
  const bytes = new Uint8Array(ciphertext);
  let encoded = '';
  for (let i = 0; i < bytes.length; i += 8192) encoded += String.fromCharCode(...bytes.subarray(i, i + 8192));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ salt: [...salt], iv: [...iv], data: btoa(encoded) }));
}

export async function unlockOfflineAtlas(passphrase: string): Promise<OfflineCopy> {
  const entry = localStorage.getItem(STORAGE_KEY);
  if (!entry) throw new Error('No offline copy is saved on this device.');
  const { salt, iv, data } = JSON.parse(entry);
  const key = await deriveKey(passphrase, new Uint8Array(salt));
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) }, key, Uint8Array.from(atob(data), char => char.charCodeAt(0)),
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export async function prepareOfflineAtlas() {
  if (!('serviceWorker' in navigator)) throw new Error('This browser cannot prepare offline access.');
  await navigator.serviceWorker.register('/guest-offline.js');
  const registration = await navigator.serviceWorker.ready;
  // update() may activate a newer worker on a browser that already uses Guest mode.
  await registration.update();
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker) throw new Error('Offline access could not start.');

  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const finish = (error?: Error) => {
      clearTimeout(timer);
      worker.removeEventListener('statechange', send);
      channel.port1.close();
      if (error) reject(error); else resolve();
    };
    function send() {
      if (worker!.state === 'activated') {
        worker!.removeEventListener('statechange', send);
        worker!.postMessage('prepare-offline-atlas', [channel.port2]);
      } else if (worker!.state === 'redundant') finish(new Error('Offline setup could not start.'));
    }
    const timer = setTimeout(() => finish(new Error('Offline setup timed out. Try again while online.')), 20_000);
    channel.port1.onmessage = event => finish(event.data === true ? undefined : new Error('The offline workspace could not be downloaded.'));
    worker.addEventListener('statechange', send);
    send();
  });
}
