'use client';

import { useRef, useState } from 'react';

export default function PostMakerVideo() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function play() {
    setPlaying(true);
    // Le <video> se monte quand playing=true ; on lance la lecture au tick suivant.
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
  }

  return (
    <div className="mx-auto mb-6 max-w-md">
      {/* Flèche + libellé */}
      <div className="mb-2 flex items-center justify-center gap-2 text-center">
        <p className="text-sm font-bold text-orange-700">
          Voici ce que tu auras après ton abonnement
        </p>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0 text-orange-500">
          <path d="M12 4v13m0 0l-5-5m5 5l5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-orange-200 bg-black shadow-soft ring-1 ring-orange-100">
        {playing ? (
          <video
            ref={videoRef}
            src="/videos/ai-post-maker.mp4"
            poster="/videos/ai-post-maker-poster.jpg"
            controls
            playsInline
            preload="metadata"
            className="block aspect-video w-full"
          />
        ) : (
          <button
            type="button"
            onClick={play}
            aria-label="Lire la vidéo de présentation"
            className="group relative block aspect-video w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/videos/ai-post-maker-poster.jpg"
              alt="Présentation d’AI Post Maker"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/20" />
            {/* Bouton play centré */}
            <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-orange-500 text-white shadow-lg ring-4 ring-white/30 transition group-hover:scale-105 group-hover:bg-orange-600">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
