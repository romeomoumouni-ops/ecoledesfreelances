// Support IA public (/support) : l'IA vérifie si une personne a payé et lui
// envoie ses accès, sans qu'elle ait besoin d'être connectée.
//
// Sécurité : l'IA ne décide JAMAIS d'une adresse d'envoi. Elle ne peut envoyer
// qu'à l'adresse que le serveur vient de vérifier comme ayant payé.

import Anthropic from '@anthropic-ai/sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendWelcomeEmailDetailed, sendLoginReminderEmailDetailed } from '@/lib/email';

const MODEL = process.env.SUPPORT_AI_MODEL || 'claude-haiku-4-5-20251001';
const SECRET = () => process.env.CHARIOW_GRANT_SECRET;

export type Lookup = {
  found: boolean;
  email: string;
  has_account: boolean;
  access_active?: boolean;
  plan?: string;
  payments_count?: number;
  total_payments?: number;
  suggestions?: string[];
};

export function supabaseAnon() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

const SYSTEM = `Tu es l'assistant d'accès de L'École des Freelances (programme d'accompagnement de freelances, surtout en Afrique francophone). Tu parles à une personne qui n'est PAS connectée : elle vient vérifier si son paiement est bien enregistré et récupérer ses accès.

Ta mission, dans l'ordre :
1. Demander l'adresse e-mail utilisée AU MOMENT DU PAIEMENT (pas une autre).
2. La vérifier avec l'outil verifier_email. Si le paiement est confirmé, LE SERVEUR ENVOIE LUI-MÊME l'e-mail d'accès : le résultat de l'outil te dit exactement ce qui s'est passé (email_sent). Tu ne fais que le raconter, fidèlement.
3. Selon le résultat de l'outil :
   - found=true, has_account=false, email_sent=true → « ton paiement est bien enregistré, je viens de t'envoyer ton accès à [adresse] : ouvre l'e-mail, clique sur le bouton et crée ton compte avec CETTE adresse exactement ». Conseille de vérifier les spams.
   - found=true, has_account=true, email_sent=true → « ton compte existe déjà avec cette adresse, je t'ai envoyé un rappel » : il se connecte sur la page de connexion avec cette adresse et son mot de passe ; mot de passe oublié → répondre à l'e-mail reçu, l'équipe le réinitialise.
   - found=true, email_sent=false, email_status="already_recent" → un e-mail lui a DÉJÀ été envoyé dans les dernières 24 h : lui dire de bien chercher dans sa boîte (spams, promotions), sans dire que tu viens d'envoyer.
   - found=true, email_sent=false (autre) → le paiement est confirmé mais l'e-mail n'est pas parti : l'orienter vers WhatsApp.
   - found=true, access_active=false → formule en plusieurs fois avec une échéance à régler ; l'accès se réactive automatiquement après paiement ; le renvoyer vers la page de connexion où le bouton de paiement l'attend.
   - found=false avec suggestions → « je ne trouve pas cette adresse, mais je vois [suggestion] — c'est bien la tienne ? », puis vérifier celle qu'il confirme.
   - found=false sans suggestion → demander s'il a pu utiliser une autre adresse (professionnelle, ancienne, celle de la personne qui a payé pour lui), et la vérifier. Après deux adresses introuvables : expliquer calmement qu'aucun paiement n'est enregistré sous ces adresses, donc que le paiement n'a pas été fait via le lien officiel de l'école. L'inviter à rejoindre via la page de vente, ou, s'il est certain d'avoir payé (Western Union, virement…), à écrire à l'équipe sur WhatsApp au +229 01 57 34 28 14 avec sa preuve de paiement.

Règles absolues :
- Réponds en français, tutoiement, chaleureux, court (2 à 5 phrases), sans listes lourdes ni astérisques.
- Ne demande JAMAIS de mot de passe, de code, ni de numéro de carte. Ne promets aucun remboursement.
- N'invente rien : aucun lien, aucune date, aucun montant qui ne vienne pas des outils.
- Une adresse mal formée (sans @) : demande de la retaper.
- Si la personne pose une question sans rapport (cours, contenu, prix…), réponds en une phrase que ce guichet sert uniquement aux accès, et qu'une fois connectée elle peut écrire aux coachs depuis la plateforme.
- Ne dis JAMAIS qu'un e-mail a été envoyé si le résultat de l'outil ne contient pas email_sent=true. Tu n'envoies rien toi-même : le serveur s'en charge.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'verifier_email',
    description: "Vérifie si une adresse e-mail a payé l'accès à l'école, si un compte existe, et si l'accès est actif. Si le paiement est confirmé, le serveur envoie AUTOMATIQUEMENT l'e-mail d'accès (ou de rappel de connexion) à cette adresse et le résultat indique email_sent. Propose des corrections d'orthographe si l'adresse est introuvable.",
    input_schema: {
      type: 'object',
      properties: { email: { type: 'string', description: 'Adresse e-mail à vérifier' } },
      required: ['email'],
    },
  },
];

export type Turn = { role: 'user' | 'assistant'; body: string };

/** Fait tourner l'IA avec ses outils. Renvoie la réponse + les notes d'audit. */
export async function runSupportAI(
  history: Turn[],
  verifiedEmail: string | null
): Promise<{ reply: string; notes: string[]; verifiedEmail: string | null; outcome: string | null }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { reply: "Le support est momentanément indisponible. Écris-nous sur WhatsApp au +229 01 57 34 28 14.", notes: ['ANTHROPIC_API_KEY manquante'], verifiedEmail, outcome: null };

  const supabase = supabaseAnon();
  const client = new Anthropic({ apiKey: key });
  const notes: string[] = [];
  let outcome: string | null = null;

  // Historique → tours (fusion des tours consécutifs, l'API exige l'alternance)
  const messages: Anthropic.MessageParam[] = [];
  for (const t of history) {
    const last = messages[messages.length - 1];
    if (last && last.role === t.role && typeof last.content === 'string') last.content += `\n\n${t.body}`;
    else messages.push({ role: t.role, content: t.body });
  }
  if (messages[0]?.role === 'assistant') messages.shift();
  if (!messages.length) return { reply: '', notes, verifiedEmail, outcome };

  for (let step = 0; step < 5; step++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.3,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      messages,
    });

    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (res.stop_reason !== 'tool_use' || !toolUses.length) {
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
      // Jamais d'astérisques ni de mise en forme Markdown dans une bulle de chat
      return { reply: text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)\*(\S.*?\S)\*(?=\s|$)/g, '$1$2'), notes, verifiedEmail, outcome };
    }

    messages.push({ role: 'assistant', content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];

    for (const tu of toolUses) {
      let result: unknown;
      if (tu.name === 'verifier_email') {
        const raw = String((tu.input as { email?: string }).email ?? '').trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)) {
          result = { error: 'adresse_invalide' };
          notes.push(`🔎 Vérification refusée : « ${raw} » n'est pas une adresse valide`);
        } else {
          const { data } = await supabase.rpc('support_lookup', { p_secret: SECRET(), p_email: raw });
          const lk = (data ?? { found: false, email: raw, has_account: false }) as Lookup;
          if (!lk.found) {
            result = lk;
            notes.push(`🔎 ${lk.email} → introuvable${lk.suggestions?.length ? ` · suggestions : ${lk.suggestions.join(', ')}` : ''}`);
            if (!outcome) outcome = 'not_found';
          } else {
            verifiedEmail = lk.email;
            notes.push(`🔎 ${lk.email} → PAYÉ (${lk.plan} ${lk.payments_count}/${lk.total_payments}) · compte : ${lk.has_account ? 'oui' : 'non'} · accès : ${lk.access_active ? 'actif' : 'expiré'}`);
            // LE SERVEUR envoie (jamais l'IA) — uniquement à l'adresse vérifiée,
            // uniquement si l'accès est actif, au plus une fois par 24 h.
            let email_sent = false;
            let email_status: 'sent' | 'already_recent' | 'failed' | 'access_expired' = 'access_expired';
            if (lk.access_active) {
              const { data: recent } = await supabase.rpc('support_recent_send', { p_secret: SECRET(), p_email: lk.email });
              if (recent) {
                email_status = 'already_recent';
                notes.push(`✉️ Envoi bloqué (déjà envoyé <24 h) à ${lk.email}`);
              } else {
                const r = lk.has_account ? await sendLoginReminderEmailDetailed(lk.email) : await sendWelcomeEmailDetailed(lk.email);
                email_sent = r.ok;
                email_status = r.ok ? 'sent' : 'failed';
                if (r.ok) {
                  await supabase.rpc('support_record_send', { p_secret: SECRET(), p_email: lk.email });
                  notes.push(`✉️ ${lk.has_account ? 'Rappel de connexion' : 'Accès'} envoyé à ${lk.email}`);
                } else {
                  notes.push(`✉️ ÉCHEC d'envoi à ${lk.email} — Resend : ${r.error ?? 'erreur inconnue'}`);
                }
              }
            }
            outcome = !lk.access_active ? 'paid_expired'
              : email_sent ? (lk.has_account ? 'paid_has_account_sent' : 'paid_sent')
              : (lk.has_account ? 'paid_has_account' : 'paid_no_account');
            result = { ...lk, email_sent, email_status };
          }
        }
      } else {
        result = { error: 'outil_inconnu' };
      }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
    }
    messages.push({ role: 'user', content: results });
  }
  return { reply: "Je n'arrive pas à finaliser. Écris-nous sur WhatsApp au +229 01 57 34 28 14, l'équipe s'en occupe.", notes, verifiedEmail, outcome };
}
