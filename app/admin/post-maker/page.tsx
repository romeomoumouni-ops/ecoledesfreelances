import { createClient } from '@/lib/supabase/server';
import PostMakerAdminForm from './PostMakerAdminForm';

export const dynamic = 'force-dynamic';

const PRIX_FCFA = 15000;
const TAUX_FCFA = 655.96; // 1 USD ≈ FCFA (approx, pour convertir le coût IA)

type Stats = {
  gen_total: number; gen_today: number; gen_month: number;
  gen_posts: number; gen_prospect: number;
  cost_total_usd: number; cost_today_usd: number; cost_month_usd: number;
  subscribers_active: number; pay_count: number; pay_month: number;
  recent: { email: string; created_at: string; valid_until: string }[];
};

function fcfa(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}
function usd(n: number): string {
  return '$' + (n || 0).toFixed(2);
}
function Kpi({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-orange-200 bg-orange-50/50' : 'border-line bg-white'}`}>
      <div className="text-xl font-extrabold tracking-tight text-ink">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted">{label}</div>
    </div>
  );
}

export default async function AdminPostMakerPage() {
  const supabase = createClient();
  const { data } = await supabase.rpc('post_maker_admin_stats');
  const s = (data ?? {}) as Partial<Stats>;

  const payCount = s.pay_count ?? 0;
  const payMonth = s.pay_month ?? 0;
  const revenuTotal = payCount * PRIX_FCFA;
  const revenuMois = payMonth * PRIX_FCFA;
  const coutTotalUsd = Number(s.cost_total_usd ?? 0);
  const coutMoisUsd = Number(s.cost_month_usd ?? 0);
  const coutTotalFcfa = coutTotalUsd * TAUX_FCFA;
  const marge = revenuTotal - coutTotalFcfa;
  const genTotal = s.gen_total ?? 0;
  const coutMoyenUsd = genTotal ? coutTotalUsd / genTotal : 0;
  const recent = (s.recent ?? []) as Stats['recent'];

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">AI Post Maker</h1>
      <p className="mt-1 text-sm text-muted">
        L&apos;outil utilise l&apos;API Claude : chaque génération a un coût réel (suivi ci-dessous). Abonnement à {fcfa(PRIX_FCFA)}/mois.
      </p>

      {/* Revenus */}
      <h2 className="mt-7 text-sm font-bold uppercase tracking-wide text-muted">Revenus</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi accent value={fcfa(revenuTotal)} label="Revenu total" />
        <Kpi value={fcfa(revenuMois)} label="Ce mois-ci" />
        <Kpi value={String(s.subscribers_active ?? 0)} label="Abonnés actifs" />
        <Kpi value={String(payCount)} label="Paiements reçus" />
      </div>

      {/* Statistiques IA (coût) */}
      <h2 className="mt-7 text-sm font-bold uppercase tracking-wide text-muted">Statistiques IA (coût API Claude)</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi value={usd(coutTotalUsd)} label={`Coût total (≈ ${fcfa(coutTotalFcfa)})`} />
        <Kpi value={usd(coutMoisUsd)} label="Coût ce mois-ci" />
        <Kpi value={usd(coutMoyenUsd)} label="Coût moyen / génération" />
        <Kpi value={String(genTotal)} label={`Générations (${s.gen_posts ?? 0} posts · ${s.gen_prospect ?? 0} prospection)`} />
      </div>

      {/* Marge */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Marge (revenu − coût IA)</span>
          <span className={`text-lg font-extrabold ${marge >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fcfa(marge)}</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {genTotal > 0
            ? `À ~${usd(coutMoyenUsd)} par génération, un abonné pourrait faire ~${Math.round(PRIX_FCFA / (coutMoyenUsd * TAUX_FCFA || 1))} générations avant d'entamer sa mensualité.`
            : 'Aucune génération pour le moment.'}
        </p>
      </div>

      {/* Derniers paiements */}
      {recent.length > 0 && (
        <>
          <h2 className="mt-7 text-sm font-bold uppercase tracking-wide text-muted">Derniers paiements</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.02] text-left text-xs text-muted">
                <tr><th className="px-4 py-2 font-semibold">Élève</th><th className="px-4 py-2 font-semibold">Montant</th><th className="px-4 py-2 font-semibold">Payé le</th><th className="px-4 py-2 font-semibold">Accès jusqu&apos;au</th></tr>
              </thead>
              <tbody>
                {recent.map((p, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-4 py-2 font-medium text-ink">{p.email}</td>
                    <td className="px-4 py-2">{fcfa(PRIX_FCFA)}</td>
                    <td className="px-4 py-2 text-muted">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2 text-muted">{p.valid_until ? new Date(p.valid_until).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Activation manuelle */}
      <h2 className="mt-7 text-sm font-bold uppercase tracking-wide text-muted">Activer un accès (paiement hors ligne)</h2>
      <p className="mt-1 text-sm text-muted">Chariow, Mobile Money, Western Union… Le compte doit déjà exister.</p>
      <div className="mt-3 max-w-lg">
        <PostMakerAdminForm />
      </div>
    </>
  );
}
