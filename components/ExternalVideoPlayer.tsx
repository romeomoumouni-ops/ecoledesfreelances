'use client';

// Lecteur pour les vidéos hébergées ailleurs (YouTube, Vimeo, Loom, Drive),
// VERROUILLÉ sur la plateforme :
//  - aucun logo ni titre cliquable, aucune suggestion de fin
//  - une couche transparente couvre toute la vidéo : un clic met en
//    pause/relance, il ne peut JAMAIS ouvrir le site d'origine
//  - pour YouTube, ses contrôles sont désactivés et remplacés par les nôtres
//    (lecture, barre de progression, temps, plein écran)

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExternalVideo } from '@/lib/video-embed';
import { IconPlayFill } from '@/components/Icons';

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  return h > 0
    ? `${h}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export default function ExternalVideoPlayer({
  video,
  startAt = 0,
  onProgress,
}: {
  video: ExternalVideo;
  startAt?: number;
  onProgress?: (seconds: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);

  const isYouTube = video.provider === 'youtube';

  /* ---- Commandes YouTube (API iframe, via postMessage) ---- */
  const cmd = useCallback(
    (func: string, args: unknown[] = []) => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    },
    []
  );

  // On s'abonne aux informations du lecteur (temps, durée, état)
  useEffect(() => {
    if (!isYouTube) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const hello = () =>
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: video.id, channel: 'widget' }),
        '*'
      );
    const t = setInterval(hello, 500); // jusqu'à ce que le lecteur réponde

    function onMessage(e: MessageEvent) {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname.replace(/^www\./, '')))
        return;
      let data: { event?: string; info?: Record<string, unknown> };
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      const info = data?.info;
      if (!info) return;
      if (!ready) {
        setReady(true);
        clearInterval(t);
        if (startAt > 3) cmd('seekTo', [startAt, true]);
      }
      if (typeof info.duration === 'number' && info.duration > 0) setDuration(info.duration);
      if (typeof info.currentTime === 'number') {
        setCurrent(info.currentTime);
        onProgress?.(info.currentTime);
      }
      if (typeof info.playerState === 'number') setPlaying(info.playerState === 1);
    }

    window.addEventListener('message', onMessage);
    return () => {
      clearInterval(t);
      window.removeEventListener('message', onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYouTube, video.id, ready]);

  function toggle() {
    if (!isYouTube) return;
    if (playing) cmd('pauseVideo');
    else cmd('playVideo');
    setPlaying((v) => !v);
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!isYouTube || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    cmd('seekTo', [ratio * duration, true]);
    setCurrent(ratio * duration);
  }

  function fullscreen() {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  const pct = duration ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div ref={wrapRef} className="relative bg-ink">
      <div className="relative aspect-video w-full">
        <iframe
          ref={iframeRef}
          src={video.embedUrl}
          title="Vidéo du chapitre"
          className="absolute inset-0 h-full w-full"
          // On n'autorise QUE ce qui est nécessaire à la lecture : pas de
          // navigation vers un autre site depuis l'iframe.
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Bouclier : absorbe TOUS les clics (logos, titre, fin de vidéo).
            Sur YouTube il sert aussi de lecture/pause. */}
        {isYouTube ? (
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Mettre en pause' : 'Lire la vidéo'}
            className="absolute inset-0 h-full w-full cursor-pointer bg-transparent"
          >
            {!playing && (
              <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-lg">
                <IconPlayFill width={24} height={24} className="ml-1" />
              </span>
            )}
          </button>
        ) : (
          <>
            {/* Vimeo / Loom / Drive : on garde leurs contrôles (bas de l'écran)
                mais on neutralise les zones de marque (haut + coin logo). */}
            <div className="absolute inset-x-0 top-0 h-14" aria-hidden />
            <div className="absolute bottom-0 right-0 h-11 w-16" aria-hidden />
          </>
        )}
      </div>

      {/* Nos propres contrôles (YouTube seulement : les siens sont désactivés) */}
      {isYouTube && (
        <div className="flex items-center gap-3 bg-ink px-3 py-2.5 text-white">
          <button
            type="button"
            onClick={toggle}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"
            aria-label={playing ? 'Pause' : 'Lecture'}
          >
            {playing ? (
              <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <IconPlayFill width={13} height={13} className="ml-0.5" />
            )}
          </button>

          <div
            onClick={seek}
            className="group h-4 flex-1 cursor-pointer py-1.5"
            role="slider"
            aria-label="Progression"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
          >
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-[width] duration-200" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <span className="shrink-0 text-xs font-medium tabular-nums text-white/80">
            {fmt(current)} / {fmt(duration)}
          </span>

          <button
            type="button"
            onClick={fullscreen}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-white/15"
            aria-label="Plein écran"
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
