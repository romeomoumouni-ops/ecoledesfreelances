'use client';

// Limite d'appareils : à l'ouverture de l'app, on enregistre l'appareil courant
// (identifiant persistant en localStorage). Au-delà de 3 appareils, cet appareil
// est bloqué et la session est fermée. Les admins ne sont pas limités.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { IconShield, IconLogout } from '@/components/Icons';

const supabase = createClient();

function deviceLabel(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const os =
    /iPhone|iPad|iPod/i.test(ua) ? 'iPhone / iPad'
    : /Android/i.test(ua) ? 'Android'
    : /Mac/i.test(ua) ? 'Mac'
    : /Windows/i.test(ua) ? 'Windows'
    : 'Appareil';
  const nav =
    /Chrome/i.test(ua) && !/Edg/i.test(ua) ? 'Chrome'
    : /Safari/i.test(ua) && !/Chrome/i.test(ua) ? 'Safari'
    : /Firefox/i.test(ua) ? 'Firefox'
    : /Edg/i.test(ua) ? 'Edge'
    : '';
  return nav ? `${os} · ${nav}` : os;
}

export default function DeviceGuard() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    try {
      let id = localStorage.getItem('device_id');
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('device_id', id);
      }
      supabase
        .rpc('touch_device', { p_device: id, p_label: deviceLabel() })
        .then(({ data }) => {
          if (data && (data as { allowed?: boolean }).allowed === false) {
            setBlocked(true);
            // On ferme la session pour couper l'accès sur cet appareil.
            void supabase.auth.signOut();
          }
        });
    } catch {
      // localStorage indisponible (navigation privée stricte) : on ne bloque pas.
    }
  }, []);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f7f7f5] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="card p-6 sm:p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-black/[0.05] text-ink">
            <IconShield width={22} height={22} />
          </span>
          <h1 className="mt-4 text-xl font-bold text-ink">Trop d&apos;appareils connectés</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ton compte est déjà utilisé sur <b className="text-ink">3 appareils</b> (la limite autorisée).
            Pour te connecter ici, déconnecte-toi d&apos;un autre appareil, ou contacte l&apos;équipe si tu as
            changé de téléphone.
          </p>
          <a href="/connexion" className="btn-primary mx-auto mt-6">
            <IconLogout width={16} height={16} /> Aller à la connexion
          </a>
        </div>
      </div>
    </div>
  );
}
