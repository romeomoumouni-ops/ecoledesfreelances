'use client';

import { useRef, useState } from 'react';
import { PageHeader } from '@/components/UI';
import Avatar from '@/components/Avatar';
import { currentUser } from '@/lib/data';
import {
  IconUsers,
  IconLock,
  IconBell,
  IconCertificate,
  IconCamera,
} from '@/components/Icons';

const sections = [
  { id: 'profil', label: 'Profil', Icon: IconUsers },
  { id: 'securite', label: 'Sécurité', Icon: IconLock },
  { id: 'notifications', label: 'Notifications', Icon: IconBell },
  { id: 'abonnement', label: 'Abonnement', Icon: IconCertificate },
] as const;

export default function ParametresPage() {
  const [section, setSection] = useState<(typeof sections)[number]['id']>('profil');
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    e.target.value = '';
  }

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Gérez votre compte, votre sécurité et vos préférences." />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Navigation latérale */}
        <aside className="card h-fit p-3">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                section === s.id ? 'bg-black/[0.04] text-ink' : 'text-muted hover:bg-black/[0.04] hover:text-ink'
              }`}
            >
              <s.Icon width={18} height={18} />
              {s.label}
            </button>
          ))}
        </aside>

        {/* Contenu */}
        <div className="card p-6">
          {section === 'profil' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-ink">Informations du profil</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {photo ? (
                    <img
                      src={photo}
                      alt="Photo de profil"
                      className="h-[72px] w-[72px] rounded-full object-cover"
                    />
                  ) : (
                    <Avatar initials={currentUser.initials} size={72} />
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-ink text-white shadow-soft transition hover:bg-black"
                    aria-label="Changer la photo"
                  >
                    <IconCamera width={16} height={16} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhoto}
                  />
                </div>
                <div>
                  <p className="font-bold text-ink">{currentUser.name}</p>
                  <p className="text-sm text-muted">{currentUser.role}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="font-semibold text-ink hover:underline"
                    >
                      Changer la photo
                    </button>
                    {photo && (
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(photo);
                          setPhoto(null);
                        }}
                        className="text-muted hover:text-ink"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prénom" value="Awa" />
                <Field label="Nom" value="Diop" />
                <Field label="Adresse e-mail" value="awa.diop@email.com" type="email" />
                <Field label="Téléphone" value="+221 77 000 00 00" />
                <div className="sm:col-span-2">
                  <label className="label">Bio</label>
                  <textarea
                    className="input min-h-[90px] resize-none"
                    defaultValue="Future designer freelance, passionnée par les interfaces."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-line pt-5">
                <button className="btn-outline">Annuler</button>
                <button className="btn-primary">Enregistrer les modifications</button>
              </div>
            </div>
          )}

          {section === 'securite' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-ink">Sécurité</h2>
              <div className="grid max-w-md gap-4">
                <Field label="Mot de passe actuel" value="" type="password" placeholder="••••••••" />
                <Field label="Nouveau mot de passe" value="" type="password" placeholder="••••••••" />
                <Field label="Confirmer le mot de passe" value="" type="password" placeholder="••••••••" />
              </div>
              <div className="flex justify-end border-t border-line pt-5">
                <button className="btn-primary">Mettre à jour le mot de passe</button>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-ink">Notifications</h2>
              {[
                ['Nouvelles leçons disponibles', true],
                ['Rappels de devoirs', true],
                ['Activité de la communauté', false],
                ['Évolution du classement', true],
                ['Offres et nouveautés', false],
              ].map(([label, on]) => (
                <Toggle key={label as string} label={label as string} defaultOn={on as boolean} />
              ))}
            </div>
          )}

          {section === 'abonnement' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-ink">Mon accès</h2>
              <div className="border border-line bg-black/[0.04] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-ink">Programme L&apos;École des Freelances</p>
                    <p className="text-sm text-muted">
                      Vous avez accès à l&apos;intégralité du programme et à la communauté.
                    </p>
                  </div>
                  <span className="chip bg-ink text-white">Actif</span>
                </div>
              </div>
              <div className="border border-line p-5">
                <p className="text-sm text-muted">Membre depuis le</p>
                <p className="font-bold text-ink">15 mai 2026</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} defaultValue={value} placeholder={placeholder} />
    </div>
  );
}

function Toggle({ label, defaultOn }: { label: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between rounded-xl border border-line p-4">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <button
        onClick={() => setOn((v) => !v)}
        className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-ink' : 'bg-gray-300'}`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            on ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}
