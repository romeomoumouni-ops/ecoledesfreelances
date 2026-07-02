'use client';

// Zone de saisie avec barre d'outils visible (Gras / Italique / Lien), collée
// au-dessus du champ. On clique sur un bouton : la mise en forme s'applique à la
// sélection (ou insère un repère). Le rendu est assuré par <RichText/>.
// Composant contrôlé : value + onChange.

import { useRef } from 'react';
import { IconLink } from '@/components/Icons';

export default function RichTextArea({
  value,
  onChange,
  placeholder,
  minHeightClass = 'min-h-[80px]',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  className?: string;
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
    const url = window.prompt('Colle l’adresse du lien (https://…)', 'https://');
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

  const Btn = ({
    onClick,
    title,
    children,
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()} // garde la sélection dans le textarea
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-black/[0.06] hover:text-ink"
    >
      {children}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white transition-all focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
      {/* Barre d'outils */}
      <div className="flex items-center gap-0.5 border-b border-line bg-[#fafafa] px-1.5 py-1">
        <Btn onClick={() => surround('**', 'texte en gras')} title="Gras">
          <span className="text-[15px] font-bold">B</span>
        </Btn>
        <Btn onClick={() => surround('*', 'texte en italique')} title="Italique">
          <span className="font-serif text-[15px] italic">I</span>
        </Btn>
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn onClick={insertLink} title="Insérer un lien">
          <IconLink width={16} height={16} />
        </Btn>
        <span className="ml-auto pr-1.5 text-[11px] font-medium text-muted/80">Mise en forme</span>
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full resize-none bg-transparent px-3.5 py-2.5 text-sm outline-none placeholder:text-muted/60 ${minHeightClass} ${className}`}
      />
    </div>
  );
}
