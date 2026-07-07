'use client';

import { useEffect, useRef, useState } from 'react';
import { IconPlayFill } from '@/components/Icons';

/**
 * Message vocal d'accueil joué à l'arrivée sur la page de connexion, pour guider
 * les nouveaux acheteurs.
 *
 * Les navigateurs interdisent la lecture audio AVEC son avant toute interaction
 * (surtout sur mobile). On maximise donc les chances :
 *  1. tentative de lecture immédiate au chargement ;
 *  2. si bloquée, on rejoue au tout premier geste de l'utilisateur (tap, clic,
 *     touche) — ce qui arrive dès qu'il touche le champ e-mail ;
 *  3. un bandeau « Écouter » reste visible comme dernier recours.
 * On ne le joue qu'une fois par session.
 */
const PLAYED_KEY = 'guide_connexion_played';

export default function ConnexionGuideAudio({ src = '/guide-connexion.m4a' }: { src?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Déjà écouté dans cette session : on n'insiste pas.
    let alreadyPlayed = false;
    try {
      alreadyPlayed = sessionStorage.getItem(PLAYED_KEY) === '1';
    } catch {
      /* sessionStorage indisponible */
    }
    if (alreadyPlayed) {
      setHidden(true);
      return;
    }

    let armed = true;
    const markPlayed = () => {
      try {
        sessionStorage.setItem(PLAYED_KEY, '1');
      } catch {
        /* ignore */
      }
    };

    // Tous les gestes qui « débloquent » l'audio (souris PC incluse).
    const EVENTS = ['pointerdown', 'mousedown', 'click', 'keydown', 'touchstart'];

    const onFirstInteract = () => {
      if (armed) tryPlay();
    };

    const disarm = () => {
      armed = false;
      EVENTS.forEach((e) => document.removeEventListener(e, onFirstInteract, true));
    };

    function tryPlay() {
      audio!
        .play()
        .then(() => {
          setPlaying(true);
          markPlayed();
          disarm();
        })
        .catch(() => {
          /* autoplay bloqué : on attend le premier geste utilisateur */
        });
    }

    const onEnded = () => {
      setPlaying(false);
      setDone(true);
    };
    audio.addEventListener('ended', onEnded);

    // 1) tentative directe
    tryPlay();
    // 2) filet : au tout premier geste sur la page (clic/souris PC, tap, clavier)
    EVENTS.forEach((e) => document.addEventListener(e, onFirstInteract, true));

    return () => {
      disarm();
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
      setDone(false);
      try {
        sessionStorage.setItem(PLAYED_KEY, '1');
      } catch {
        /* ignore */
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  // Une fois masqué, on garde juste l'élément audio (au cas où il joue encore).
  if (hidden) return <audio ref={audioRef} src={src} preload="auto" />;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Mettre en pause' : 'Écouter le message'}
        className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-black ${
          !playing && !done ? 'animate-pulse' : ''
        }`}
      >
        {playing ? (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <IconPlayFill width={16} height={16} className="ml-0.5" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">🔊 Message d&apos;accueil — à écouter</p>
        <p className="text-xs leading-snug text-muted">
          {playing
            ? 'Lecture en cours…'
            : done
            ? 'Message terminé. Appuie pour réécouter.'
            : 'Un message vocal te guide. Appuie sur ▶ pour l’écouter.'}
        </p>
      </div>
      <audio ref={audioRef} src={src} preload="auto" />
    </div>
  );
}
