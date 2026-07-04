'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/UI';
import Avatar from '@/components/Avatar';
import { IconUsers, IconLock, IconBell, IconCamera } from '@/components/Icons';

type P = { id: string; fullName: string; email: string; avatarUrl: string | null; isAdmin: boolean };
const sections = [
  { id: 'profil', label: 'Profil', Icon: IconUsers },
  { id: 'securite', label: 'Sécurité', Icon: IconLock },
  { id: 'notifications', label: 'Notifications', Icon: IconBell },
] as const;

function initials(name: string, email: string) {
  return (name || email || 'M').split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function ParametresClient({ profile }: { profile: P }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState<(typeof sections)[number]['id']>('profil');

  const [name, setName] = useState(profile.fullName);
  const [photo, setPhoto] = useState<string | null>(profile.avatarUrl);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function flash(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setBusy('photo');
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl;
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', profile.id);
      if (updErr) throw updErr;
      setPhoto(url);
      flash(true, 'Photo mise à jour.');
      router.refresh();
    } catch {
      flash(false, "Échec de l'envoi de la photo.");
    } finally {
      setBusy(null);
    }
  }

  async function saveProfile() {
    setBusy('profil');
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('id', profile.id);
      if (error) throw error;
      flash(true, 'Profil enregistré.');
      router.refresh();
    } catch {
      flash(false, "Échec de l'enregistrement.");
    } finally {
      setBusy(null);
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const pwd = (form.elements.namedItem('newpwd') as HTMLInputElement).value;
    if (pwd.length < 8) return flash(false, 'Mot de passe : 8 caractères minimum.');
    setBusy('pwd');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      form.reset();
      flash(true, 'Mot de passe mis à jour.');
    } catch {
      flash(false, 'Échec de la mise à jour du mot de passe.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Gérez votre compte et vos préférences." />

      {toast && (
        <div
          className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${
            toast.ok ? 'bg-black/[0.04] text-ink' : 'bg-red-50 text-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Nav sections — scroll horizontal sur mobile */}
        <aside className="card h-fit overflow-x-auto p-2 lg:p-3">
          <div className="flex gap-1 lg:flex-col">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition ${
                  section === s.id ? 'bg-black/[0.06] text-ink' : 'text-muted hover:bg-black/[0.04] hover:text-ink'
                }`}
              >
                <s.Icon width={18} height={18} />
                {s.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="card p-5 sm:p-6">
          {section === 'profil' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-ink">Informations du profil</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar initials={initials(name, profile.email)} src={photo} size={72} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy === 'photo'}
                    className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-ink text-white shadow-soft transition hover:bg-black disabled:opacity-60"
                    aria-label="Changer la photo"
                  >
                    <IconCamera width={16} height={16} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </div>
                <div>
                  <p className="font-bold text-ink">{name || profile.email}</p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-1 text-sm font-semibold text-ink hover:underline"
                  >
                    {busy === 'photo' ? 'Envoi…' : 'Changer la photo'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nom complet</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Adresse e-mail</label>
                  <input className="input bg-black/[0.03]" value={profile.email} disabled />
                </div>
              </div>

              <div className="flex justify-end border-t border-line pt-5">
                <button onClick={saveProfile} disabled={busy === 'profil'} className="btn-primary disabled:opacity-60">
                  {busy === 'profil' ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {section === 'securite' && (
            <form onSubmit={changePassword} className="space-y-5">
              <h2 className="text-lg font-bold text-ink">Sécurité</h2>
              <div className="max-w-md">
                <label className="label">Nouveau mot de passe</label>
                <input name="newpwd" type="password" minLength={8} className="input" placeholder="8 caractères minimum" />
              </div>
              <div className="flex justify-end border-t border-line pt-5">
                <button type="submit" disabled={busy === 'pwd'} className="btn-primary disabled:opacity-60">
                  {busy === 'pwd' ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                </button>
              </div>
            </form>
          )}

          {section === 'notifications' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-ink">Notifications</h2>
              <p className="text-sm text-muted">
                La gestion fine des notifications arrivera bientôt. Vous recevrez pour l'instant les
                informations importantes de votre programme.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
