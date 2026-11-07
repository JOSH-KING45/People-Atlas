import { Fragment } from 'react';
import Link from 'next/link';

type Section = { title: string; paragraphs: string[] };

function legalText(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^)]+\)|josh\.a\.japhet@gmail\.com)/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
    if (link) return <a key={index} href={link[2]}>{link[1]}</a>;
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part === 'josh.a.japhet@gmail.com') return <a key={index} href={'mailto:' + part}>{part}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function LegalPage({ title, sections }: { title: string; sections: Section[] }) {
  return <main className="atlas-legal">
    <nav aria-label="People Atlas"><Link href="/">People Atlas</Link> · <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Use</Link></nav>
    <h1>{title}</h1>
    {sections.map(({ title: heading, paragraphs }) => <section key={heading}>
      {heading && <h2>{heading}</h2>}
      {paragraphs.map(paragraph => <p key={paragraph}>{legalText(paragraph.replace(/^- /, ''))}</p>)}
    </section>)}
  </main>;
}
