'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Garde-fou anti-sortie pendant un envoi de fichier (image, vidéo, PDF…).
 *
 * Tant que `active` est vrai :
 *  - fermeture / rechargement / navigation hors du site  → dialogue natif du
 *    navigateur (« Quitter le site ? »).
 *  - clic sur un lien interne de l'app (onglet admin, menu…) → on intercepte et
 *    on affiche un modal « Un envoi est en cours, voulez-vous vraiment quitter ? ».
 *
 * À placer dans le composant qui gère l'upload, avec `active={uploading}`.
 */
export default function UploadLeaveGuard({
  active,
  title = 'Un envoi est en cours',
  message = "Ton fichier n'a pas fini de se charger. Si tu quittes maintenant, il ne sera pas enregistré.",
}: {
  active: boolean;
  title?: string;
  message?: string;
}) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // 1) Fermeture d'onglet / rechargement / navigation externe
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  // 2) Navigation interne : on intercepte les clics sur les liens de l'app,
  //    uniquement pendant qu'un envoi est en cours.
  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      // On laisse passer clic droit/milieu, Cmd/Ctrl+clic (nouvel onglet), etc.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      // Liens qui ne sont pas une navigation interne → gérés par beforeunload
      if (
        href.startsWith('#') ||
        anchor.target === '_blank' ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return;
      }
      // Lien externe (autre domaine) → laisser le navigateur + beforeunload gérer
      if (/^https?:\/\//i.test(href) && !href.includes(window.location.host)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
    };
    // Phase de capture pour intercepter avant le routeur Next
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [active]);

  if (!pendingHref) return null;

  const leave = () => {
    const href = pendingHref;
    setPendingHref(null);
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => setPendingHref(null)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-lg font-black text-amber-600">
            !
          </span>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
        </div>
        <p className="mb-5 text-sm leading-relaxed text-muted">{message}</p>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button onClick={() => setPendingHref(null)} className="btn-primary w-full">
            Rester sur la page
          </button>
          <button onClick={leave} className="btn-outline w-full">
            Quitter quand même
          </button>
        </div>
      </div>
    </div>
  );
}
