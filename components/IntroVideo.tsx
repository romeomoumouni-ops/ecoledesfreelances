'use client';

// Vidéo de présentation de la plateforme, affichée sur le tableau de bord.
// Chargement léger (metadata seulement) : la vidéo ne se télécharge qu'au clic.

import { useRef, useState } from 'react';
import { IconPlayFill, IconArrowRight } from '@/components/Icons';

const VIDEO_URL =
  'https://bwocucqkdrlbeykikxeb.supabase.co/storage/v1/object/public/assets/presentation-plateforme.mp4';

export default function IntroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function play() {
    setStarted(true);
    void ref.current?.play();
  }

  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-video bg-ink">
        <video
          ref={ref}
          src={VIDEO_URL}
          poster="/presentation-poster.jpg"
          preload="metadata"
          playsInline
          controls={started}
          onPlay={() => setStarted(true)}
          className="h-full w-full bg-ink object-cover"
        />

        {!started && (
          <button
            onClick={play}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-black/45 via-black/10 to-black/25 text-white transition hover:from-black/55"
            aria-label="Lire la vidéo de présentation"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-ink shadow-lg transition group-hover:scale-105 sm:h-20 sm:w-20">
              <IconPlayFill width={26} height={26} className="ml-1" />
            </span>
            <span className="flex flex-col items-center gap-1.5">
              <IconArrowRight width={20} height={20} className="-rotate-90 opacity-90" />
              <span className="rounded-full bg-white/95 px-4 py-1.5 text-center text-sm font-bold text-ink shadow-sm">
                Regarde cette vidéo si tu es nouveau
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
