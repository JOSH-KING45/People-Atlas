import { newPersonId, type Person } from './people';

export type SelectedContact = { name?: string[]; tel?: string[]; email?: string[] };
export type ContactPicker = {
  select(properties: ('name' | 'tel' | 'email')[], options: { multiple: boolean }): Promise<SelectedContact[]>;
};

export function contactPicker() {
  return (navigator as Navigator & { contacts?: ContactPicker }).contacts;
}

function addValues(fields: Record<string, string>, label: string, values: string[]) {
  const unique = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  unique.forEach((value, index) => { fields[index ? `${label} ${index + 1}` : label] = value; });
}

function contactDraft(contact: SelectedContact, details: Record<string, string> = {}, notes = ''): Person {
  const name = contact.name?.find(value => value.trim())?.trim() || '';
  const fields = { ...details };
  addValues(fields, 'Phone', contact.tel || []);
  addValues(fields, 'Email', contact.email || []);
  if (name.length > 200 || notes.length > 60000 || Object.keys(fields).length > 100 ||
      Object.values(fields).some(value => value.length > 2000)) {
    throw new Error('A contact has more information than Atlas can import. Shorten its details and try again.');
  }
  return { id: newPersonId(), name, fields, notes };
}

export function selectedContactDrafts(contacts: SelectedContact[]) {
  if (contacts.length > 200) throw new Error('Choose at most 200 contacts per batch.');
  return contacts.map(contact => contactDraft(contact));
}

function unescapeText(value: string) {
  return value.replace(/\\([nN,;\\])/g, (_, char: string) => char.toLowerCase() === 'n' ? '\n' : char);
}

function parts(value: string) {
  const result: string[] = [];
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\') i++;
    else if (value[i] === ';') {
      result.push(unescapeText(value.slice(start, i)).trim());
      start = i + 1;
    }
  }
  result.push(unescapeText(value.slice(start)).trim());
  return result;
}

function decodeQuotedPrintable(value: string, charset: string) {
  const input = new TextEncoder().encode(value);
  const output: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const hex = String.fromCharCode(input[i + 1] || 0, input[i + 2] || 0);
    if (input[i] === 61 && /^[a-f\d]{2}$/i.test(hex)) {
      output.push(parseInt(hex, 16));
      i += 2;
    } else output.push(input[i]);
  }
  try { return new TextDecoder(charset).decode(Uint8Array.from(output)); }
  catch { return new TextDecoder().decode(Uint8Array.from(output)); }
}

export function readVcards(text: string): Person[] {
  const lines: string[] = [];
  for (const line of text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/)) {
    const last = lines.at(-1);
    if (last && last.endsWith('=') && /;ENCODING=QUOTED-PRINTABLE[;:]/i.test(last)) {
      lines[lines.length - 1] = last.slice(0, -1) + line.replace(/^[ \t]/, '');
    } else if (last && /^[ \t]/.test(line)) {
      lines[lines.length - 1] += line.slice(1);
    } else lines.push(line);
  }

  const drafts: Person[] = [];
  let card: Record<string, string[]> | undefined;
  const supported = new Set(['FN', 'N', 'TEL', 'EMAIL', 'ORG', 'TITLE', 'BDAY', 'NOTE', 'NICKNAME', 'URL']);
  for (const line of lines) {
    if (/^BEGIN:VCARD$/i.test(line.trim())) {
      if (card) throw new Error('A contact card is missing its END:VCARD line.');
      card = {};
      continue;
    }
    if (!card) continue;
    if (/^END:VCARD$/i.test(line.trim())) {
      if (drafts.length === 200) throw new Error('Import at most 200 contacts per batch. Split the VCF file and try again.');
      const details: Record<string, string> = {};
      for (const [property, label] of [['ORG', 'Workplace'], ['TITLE', 'Job title'], ['BDAY', 'Birthday'], ['NICKNAME', 'Nickname'], ['URL', 'Website']]) {
        const value = property === 'ORG' ? parts(card.ORG?.[0] || '').filter(Boolean).join(' · ') : unescapeText(card[property]?.[0] || '').trim();
        if (value) details[label] = value;
      }
      // N is family;given;additional;prefix;suffix.
      const nameParts = parts(card.N?.[0] || '');
      const fallback = [nameParts[3], nameParts[1], nameParts[2], nameParts[0], nameParts[4]].filter(Boolean).join(' ');
      drafts.push(contactDraft({
        name: [unescapeText(card.FN?.[0] || ''), fallback],
        tel: card.TEL?.map(value => unescapeText(value).replace(/^tel:/i, '')),
        email: card.EMAIL?.map(value => unescapeText(value).replace(/^mailto:/i, '')),
      }, details, card.NOTE?.map(unescapeText).join('\n\n')));
      card = undefined;
      continue;
    }
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const meta = line.slice(0, separator);
    const property = meta.split(';', 1)[0].split('.').at(-1)!.toUpperCase();
    if (!supported.has(property)) continue;
    let value = line.slice(separator + 1);
    if (/;ENCODING=QUOTED-PRINTABLE(?:;|$)/i.test(meta)) {
      value = decodeQuotedPrintable(value, meta.match(/;CHARSET=([^;]+)/i)?.[1] || 'utf-8');
    }
    (card[property] ??= []).push(value);
  }
  if (card) throw new Error('A contact card is missing its END:VCARD line.');
  if (!drafts.length) throw new Error('No contacts were found in this VCF file.');
  return drafts;
}
