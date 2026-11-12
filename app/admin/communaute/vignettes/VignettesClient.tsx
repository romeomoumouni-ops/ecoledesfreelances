'use client';

// Génère, dans le navigateur de l'admin, une vignette pour chaque vidéo de la
// communauté qui n'en a pas encore : capture d'une image → envoi dans
// community-media/<admin>/posters/<post>.jpg → set_post_poster(). Les vidéos
// s'affichent ensuite instantanément dans le fil (plus de cadre noir).

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { captureVideoPoster } from '@/lib/community-media';

const supabase = createClient();

type Row = { id: string; media_url: string; author_name: string | null; created_at: string };

export default function VignettesClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const stopRef = useRef(false);

  async function load() {
    setLoading(true);
    const all: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from('community_posts')
        .select('id, media_url, author_name, created_at')
        .eq('media_type', 'video')
        .is('poster_url', null)
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, from + 999);
      all.push(...((data ?? []) as Row[]));
      if (!data || data.length < 1000) break;
    }
    setRows(all);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function run() {
    setRunning(true);
    stopRef.current = false;
    setFailed([]);
    setDone(0);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    for (const r of rows) {
      if (stopRef.current) break;
      setCurrent(r.id);
      try {
        const blob = await captureVideoPoster(r.media_url, 1280);
        if (!blob) throw new Error('capture impossible');
        const path = `${user.id}/posters/${r.id}.jpg`;
        const { error: ue } = await supabase.storage
          .from('community-media')
          .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: true });
        if (ue) throw new Error(ue.message);
        const url = supabase.storage.from('community-media').getPublicUrl(path).data.publicUrl;
        const { error: re } = await supabase.rpc('set_post_poster', { p_id: r.id, p_url: url });
        if (re) throw new Error(re.message);
        setDone((n) => n + 1);
      } catch (e) {
        setFailed((f) => [...f, `${r.id} — ${e instanceof Error ? e.message : 'erreur'}`]);
      }
    }
    setCurrent(null);
    setRunning(false);
    void load();
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-ink">Vignettes des vidéos</h1>
      <p className="mb-4 text-sm text-muted">
        Les vidéos publiées avant la mise en place des vignettes s&apos;affichent en noir tant qu&apos;on ne les
        lance pas. Cet outil capture une image de chacune (dans ton navigateur) pour qu&apos;elles
        s&apos;affichent instantanément. Laisse l&apos;onglet ouvert pendant le traitement.
      </p>
      <div className="card p-4">
        {loading ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : (
          <>
            <p className="text-sm text-ink">
              <b>{rows.length.toLocaleString('fr-FR')}</b> vidéo(s) sans vignette.
              {running && (
                <>
                  {' '}
                  Traitées : <b>{done}</b> · échecs : <b>{failed.length}</b>
                  {current && <span className="text-muted"> · en cours…</span>}
                </>
              )}
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={run} disabled={running || rows.length === 0} className="btn-primary disabled:opacity-60">
                {running ? 'Génération en cours…' : 'Générer les vignettes manquantes'}
              </button>
              {running && (
                <button onClick={() => { stopRef.current = true; }} className="btn-outline">
                  Arrêter
                </button>
              )}
            </div>
            {failed.length > 0 && (
              <ul className="mt-3 max-h-60 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {failed.map((f) => <li key={f}>{f}</li>)}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}
