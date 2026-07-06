'use client';

import { useState } from 'react';
import RichText from './RichText';

// Nombre de caractères affichés avant de couper avec « Voir plus ».
const DEFAULT_LIMIT = 280;

/**
 * Affiche un texte de publication en le tronquant s'il est long : on montre les
 * premiers caractères + un bouton « Voir plus » pour lire la suite (et « Voir
 * moins » pour replier). Conserve les liens / gras / italique via RichText et
 * les retours à la ligne (whitespace-pre-line).
 *
 * Le bouton ne déclenche pas l'ouverture de la publication (stopPropagation).
 */
export default function ExpandableRichText({
  text,
  onDark = false,
  limit = DEFAULT_LIMIT,
  className = '',
}: {
  text: string | null | undefined;
  onDark?: boolean;
  limit?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const isLong = text.length > limit;
  const linkClass = onDark
    ? 'font-semibold text-white/90 underline-offset-2 hover:underline'
    : 'font-semibold text-blue-600 underline-offset-2 hover:underline';

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setExpanded((v) => !v);
  };

  if (!isLong || expanded) {
    return (
      <div className={`whitespace-pre-line ${className}`}>
        <RichText text={text} onDark={onDark} />
        {isLong && (
          <>
            {' '}
            <button type="button" onClick={toggle} className={linkClass}>
              Voir moins
            </button>
          </>
        )}
      </div>
    );
  }

  // Coupe proprement sur une frontière de mot pour ne pas casser un mot.
  let cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > limit * 0.6) cut = cut.slice(0, lastSpace);

  return (
    <div className={`whitespace-pre-line ${className}`}>
      <RichText text={cut.trimEnd() + '… '} onDark={onDark} />
      <button type="button" onClick={toggle} className={linkClass}>
        Voir plus
      </button>
    </div>
  );
}
