import type {Person} from './people';

export const NOTE_LIMIT = 60_000;
export const TEXT_IMPORT_LIMIT = 240_000;
const BATCH_LIMIT = 30_000;

// Android uses "date, time - sender:" and iOS wraps the timestamp in brackets.
const dateTime = String.raw`\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:[^\S\r\n]*[ap]\.?m\.?)?`;
const chatHeader = new RegExp(String.raw`^[\u200e\u200f\ufeff]*(?:\[${dateTime}\][^\S\r\n]*|${dateTime}[^\S\r\n]+-[^\S\r\n]+)`, 'gim');

export function isWhatsAppText(text: string) {
 return [...text.matchAll(chatHeader)].length >= 2;
}

export function splitExtractionText(text: string, chat: boolean) {
 if (!chat && text.length <= NOTE_LIMIT) return [text];
 const boundaries = chat
  ? Array.from(text.matchAll(chatHeader), match => match.index)
  : Array.from(text.matchAll(/\r?\n[\t ]*\r?\n/g), match => match.index + match[0].length);
 const batches: string[] = [];
 let start = 0;
 let boundary = 0;
 while (start < text.length) {
  let end = Math.min(start + BATCH_LIMIT, text.length);
  if (end < text.length) {
   while (boundary < boundaries.length && boundaries[boundary] <= end) boundary++;
   const preferred = boundaries[boundary - 1];
   if (preferred > start) end = preferred;
   else {
    const lineEnd = text.lastIndexOf('\n', end - 1) + 1;
    if (lineEnd > start) end = lineEnd;
    else if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
   }
  }
  batches.push(text.slice(start, end));
  start = end;
 }
 return batches.filter(batch => batch.trim());
}

export function collectBatchDrafts(people: Person[]) {
 const seen = new Set<string>();
 return people.filter(person => {
  // Same-name entries with different evidence stay separate for review.
  const key = JSON.stringify([person.name, Object.entries(person.fields).sort(), person.notes, [...(person.calculatedFields ?? [])].sort()]);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
 });
}
