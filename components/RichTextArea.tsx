'use client';

// Zone de saisie avec barre de mise en forme (Gras / Italique / Lien).
// Insère la syntaxe markdown autour de la sélection. Le rendu (côté affichage)
// est assuré par <RichText/>. Composant contrôlé : value + onChange.

import { useRef } from 'react';
import { IconLink } from '@/components/Icons';

export default function RichTextArea({
  value,
  onChange,
  placeholder,
  minHeightClass = 'min-h-[80px]',
  className = '',
  hint = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  className?: string;
  hint?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function surround(mark: string, fallback: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallback;
    const next = value.slice(0, start) + mark + selected + mark + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const s = start + mark.length;
      el.setSelectionRange(s, s + selected.length);
    });
  }

  function insertLink() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const url = window.prompt('Adresse du lien (https://…)', 'https://');
    if (!url || url === 'https://') return;
    const label = selected || 'lien';
    const md = `[${label}](${url})`;
    const next = value.slice(0, start) + md + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const p = start + md.length;
      el.setSelectionRange(p, p);
    });
  }

  const btn =
    'grid h-8 min-w-[32px] place-items-center rounded-md border border-line bg-white px-2 text-sm text-muted transition hover:bg-black/[0.04] hover:text-ink';

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <button type="button" onClick={() => surround('**', 'texte en gras')} className={btn} title="Gras" aria-label="Gras">
          <span className="font-bold">B</span>
        </button>
        <button type="button" onClick={() => surround('*', 'texte en italique')} className={btn} title="Italique" aria-label="Italique">
          <span className="italic font-serif">I</span>
        </button>
        <button type="button" onClick={insertLink} className={btn} title="Insérer un lien" aria-label="Insérer un lien">
          <IconLink width={15} height={15} />
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input resize-none ${minHeightClass} ${className}`}
      />
      {hint && (
        <p className="mt-1 text-[11px] leading-snug text-muted">
          Mise en forme : <b className="text-ink">**gras**</b>, <i>*italique*</i>. Les liens (https://…) deviennent cliquables.
        </p>
      )}
    </div>
  );
}
