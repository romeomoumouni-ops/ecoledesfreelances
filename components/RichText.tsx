import React from 'react';

// Rendu de texte sûr : liens cliquables + gras / italique / code (sous-ensemble
// markdown). Aucune injection HTML (pas de dangerouslySetInnerHTML) → pas de XSS.
// Détecte : liens markdown [txt](url), URLs https://…, www.…, domaines nus
// (comeup.com/x), et adresses e-mail. Garder `whitespace-pre-line` sur le
// conteneur pour conserver les retours à la ligne.

const TRAILING = /[.,;:!?)\]}'"»]+$/;

// TLD courants (génériques + francophones / Afrique de l'Ouest) : on ne
// transforme un domaine nu en lien que si son extension est reconnue.
const TLDS = new Set([
  'com', 'org', 'net', 'io', 'co', 'me', 'app', 'dev', 'ai', 'xyz', 'info', 'biz',
  'tv', 'gg', 'shop', 'store', 'online', 'site', 'tech', 'link', 'page', 'blog',
  'fr', 'be', 'ca', 'ch', 'eu', 'uk', 'de', 'es', 'it', 'pt', 'nl',
  'africa', 'ci', 'sn', 'bj', 'tg', 'cm', 'ma', 'ng', 'gh', 'bf', 'ml',
]);

function normalizeUrl(u: string) {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function Anchor({
  href,
  onDark,
  children,
}: {
  href: string;
  onDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={(e) => e.stopPropagation()}
      className={`break-words font-medium underline underline-offset-2 ${
        onDark ? 'text-white hover:text-white/80' : 'text-blue-600 hover:text-blue-700'
      }`}
    >
      {children}
    </a>
  );
}

// Ordre : lien markdown, gras, italique, code, e-mail, URL (scheme/www), domaine nu.
const TOKEN = new RegExp(
  [
    '\\[([^\\]\\n]+)\\]\\(([^\\s)]+)\\)', // 1=label 2=url
    '\\*\\*([^*]+?)\\*\\*', // 3=gras
    '\\*([^*\\s][^*]*?)\\*', // 4=italique
    '`([^`]+?)`', // 5=code
    '([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\\.[A-Za-z]{2,})', // 6=email
    '((?:https?:\\/\\/|www\\.)[^\\s]+)', // 7=url avec schéma ou www
    '((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}(?:\\/[^\\s]*)?)', // 8=domaine nu
  ].join('|'),
  'gi'
);

function isLinkableDomain(match: string): boolean {
  const slash = match.indexOf('/');
  const host = slash >= 0 ? match.slice(0, slash) : match;
  const tld = host.split('.').pop()?.toLowerCase() ?? '';
  return TLDS.has(tld);
}

function parseInline(text: string, onDark: boolean): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `t${i++}`;
    if (m[1] !== undefined) {
      out.push(
        <Anchor key={key} href={normalizeUrl(m[2])} onDark={onDark}>
          {m[1]}
        </Anchor>
      );
    } else if (m[3] !== undefined) {
      out.push(
        <strong key={key} className="font-bold">
          {m[3]}
        </strong>
      );
    } else if (m[4] !== undefined) {
      out.push(<em key={key}>{m[4]}</em>);
    } else if (m[5] !== undefined) {
      out.push(
        <code key={key} className="rounded bg-black/[0.06] px-1 py-0.5 text-[0.9em]">
          {m[5]}
        </code>
      );
    } else if (m[6] !== undefined) {
      out.push(
        <Anchor key={key} href={`mailto:${m[6]}`} onDark={onDark}>
          {m[6]}
        </Anchor>
      );
    } else if (m[7] !== undefined || m[8] !== undefined) {
      const raw = (m[7] ?? m[8]) as string;
      // Domaine nu : uniquement si l'extension est reconnue, sinon texte brut.
      if (m[8] !== undefined && !isLinkableDomain(raw)) {
        out.push(raw);
      } else {
        let url = raw;
        let trail = '';
        const t = TRAILING.exec(url);
        if (t) {
          trail = t[0];
          url = url.slice(0, -trail.length);
        }
        out.push(
          <Anchor key={key} href={normalizeUrl(url)} onDark={onDark}>
            {url}
          </Anchor>
        );
        if (trail) out.push(trail);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function RichText({
  text,
  onDark = false,
}: {
  text: string | null | undefined;
  onDark?: boolean;
}) {
  if (!text) return null;
  return <>{parseInline(text, onDark)}</>;
}
