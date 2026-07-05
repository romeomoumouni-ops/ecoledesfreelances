import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const AUTH_PATHS = ['/connexion', '/inscription'];
// Pages publiques accessibles SANS compte (page de vente).
const PUBLIC_PATHS = ['/paiement'];

export async function middleware(request: NextRequest) {
  // Les routes API (webhooks…) gèrent leur propre authentification (token) :
  // on ne les redirige jamais vers la page de connexion.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = AUTH_PATHS.some((p) => path.startsWith(p));
  const isPublic = isAuthPage || PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

  // Page publique (page de vente) : accessible sans compte, aucune vérif d'accès.
  if (isPublic && !isAuthPage) {
    return response;
  }

  // Non connecté → tout renvoie vers la connexion (sauf les pages d'auth)
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    return NextResponse.redirect(url);
  }

  // Déjà connecté → pas la peine de revoir connexion/inscription
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/tableau-de-bord';
    return NextResponse.redirect(url);
  }

  // Espace admin réservé aux administrateurs
  if (user && path.startsWith('/admin')) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('is_admin, is_super_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (!prof?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/tableau-de-bord';
      return NextResponse.redirect(url);
    }
    // L'espace « Accès super admin » (CA, paiements) est réservé au super admin
    if (path.startsWith('/admin/paiements') && !prof?.is_super_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  // Garde-fou paiement : sans accès actif (achat, autorisation manuelle ou
  // admin), on redirige vers /acces AVANT tout rendu de page — aucune donnée
  // (URLs vidéo signées…) n'est donc calculée ni exposée pour un compte bloqué.
  if (user && !isAuthPage && path !== '/acces') {
    const { data: access } = await supabase.rpc('get_my_access');
    const active = (access as { active?: boolean } | null)?.active === true;
    if (!active) {
      const url = request.nextUrl.clone();
      url.pathname = '/acces';
      return NextResponse.redirect(url);
    }
  }

  // Compte redevenu actif : /acces renvoie vers l'application
  if (user && path === '/acces') {
    const { data: access } = await supabase.rpc('get_my_access');
    if ((access as { active?: boolean } | null)?.active === true) {
      const url = request.nextUrl.clone();
      url.pathname = '/tableau-de-bord';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Tout sauf les assets statiques et l'icône
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
