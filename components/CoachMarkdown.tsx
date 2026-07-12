'use client';

import React from 'react';
import RichText from './RichText';

/**
 * Rendu propre des réponses de l'IA (Super Coach) : l'API renvoie du markdown
 * léger (titres #/##, listes -, séparateurs ---). Sans ce composant, l'élève
 * voyait les dièses et tirets bruts. On convertit ligne par ligne :
 *  - "# / ## / ###"  → titre en gras
 *  - "- / * / •"     → puce alignée
 *  - "1. / 2."       → liste numérotée
 *  - "---"           → fin séparateur discret
 *  - le reste        → paragraphe (gras/italique/liens gérés par RichText)
 */
export default function CoachMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const key = `l${i}`;

    if (!line.trim()) {
      out.push(<div key={key} className="h-2" />);
      return;
    }
    // Séparateur markdown --- / ***
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push(<hr key={key} className="my-2 border-line" />);
      return;
    }
    // Titres # / ## / ###
    const h = line.match(/^\s*(#{1,4})\s+(.*)$/);
    if (h) {
      out.push(
        <p key={key} className={`font-bold text-ink ${h[1].length <= 2 ? 'text-[15px]' : ''} mt-1`}>
          <RichText text={h[2]} />
        </p>
      );
      return;
    }
    // Puces - / * / •
    const b = line.match(/^\s*[-*•]\s+(.*)$/);
    if (b) {
      out.push(
        <p key={key} className="flex gap-2 pl-1">
          <span className="select-none text-muted">•</span>
          <span className="min-w-0 flex-1">
            <RichText text={b[1]} />
          </span>
        </p>
      );
      return;
    }
    // Listes numérotées 1. 2. …
    const n = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (n) {
      out.push(
        <p key={key} className="flex gap-2 pl-1">
          <span className="select-none font-semibold text-ink">{n[1]}.</span>
          <span className="min-w-0 flex-1">
            <RichText text={n[2]} />
          </span>
        </p>
      );
      return;
    }
    // Paragraphe normal — on retire les « _ » d'italique multi-ligne que
    // RichText ne gère pas (ex. « _Si ce n'était pas ta question… »).
    const cleaned = line.replace(/^\s*_+\s?/, '').replace(/\s?_+\s*$/, '');
    out.push(
      <p key={key}>
        <RichText text={cleaned} />
      </p>
    );
  });

  return <div className="space-y-0.5">{out}</div>;
}
