import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic e-mail (admin) : indique si la clé Resend est présente, quelle
 * adresse « from » est configurée, et — si ?to=email est fourni — tente un
 * envoi réel et renvoie la réponse brute de Resend. À supprimer une fois OK.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!prof?.is_admin) return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });

  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || '(non défini)';
  const hasKey = !!key && !key.startsWith('a-remplir');

  const info: Record<string, unknown> = {
    cle_resend_presente: hasKey,
    from_configure: from,
  };

  const to = req.nextUrl.searchParams.get('to');
  if (hasKey && to) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          subject: "Test d'envoi — L'École des Freelances",
          html: '<p>Ceci est un test. Si tu lis ceci, l’envoi d’e-mails fonctionne ✅</p>',
        }),
      });
      info.resend_http = res.status;
      info.resend_reponse = await res.json().catch(() => null);
    } catch (e) {
      info.erreur_reseau = e instanceof Error ? e.message : String(e);
    }
  } else if (!to) {
    info.astuce = 'Ajoute ?to=ton@email.com à l’URL pour tester un envoi réel.';
  }

  return NextResponse.json(info);
}
