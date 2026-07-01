# L'École des Freelances — Cahier de suivi du projet

> Fichier de référence : tout ce qui a été décidé depuis le début, pour ne rien
> perdre lors des gros changements. À tenir à jour à chaque évolution.
> Dernière mise à jour : 1er juillet 2026.

---

## 1. Concept

**L'École des Freelances** est une **plateforme de formation en ligne (LMS)** —
l'école en ligne du client, qui forme aux métiers du freelancing (design,
développement, marketing, rédaction, vidéo, business…).

Point clé sur le modèle :
- **Ce n'est PAS une marketplace de cours à l'unité.** L'élève **achète le
  programme complet AVANT** d'accéder à l'interface.
- Une fois dans la plateforme, **il n'y a donc aucun prix, aucune vente.** Tout
  le programme est inclus dans son accès.
- Le programme est **continu** : de nouvelles leçons s'ajoutent au fil du temps.

Projet **séparé** de la marketplace `recrutefreelance` et de `MonFuturBoulot`.
Dossier : `/Users/romeomoumouniattolou/Desktop/ecole-des-freelances`.

---

## 2. Direction artistique

- **Police : Montserrat** (via `next/font`, variable `--font-montserrat`).
- **Icônes : SVG inline** uniquement (`components/Icons.tsx`), **jamais d'emojis
  décoratifs**.
- **Style : épuré, quasi monochrome, façon Notion × Apple.**
  - Neutres : encre `#1d1d1f`, gris `#6e6e73`, lignes `#ececeb`, fond `#fbfbfa`.
  - **Le bleu n'est utilisé QUE pour le focus des champs** (accent très discret).
    Tout le reste (boutons, états actifs, badges, avatars) est en noir/gris.
  - Boutons primaires **noirs**, sélecteurs en **pastille noire**.
  - Ombres ultra-douces, cartes définies surtout par une **bordure fine**.
- **Angles légèrement arrondis** (8–18px). Pas d'angles complètement droits, pas
  d'angles trop ronds. Les cercles (avatars, pastilles) restent ronds.
- Objectif transverse : **plateforme fluide et compréhensible** — chaque élément
  doit être clair pour un élève qui découvre (ex. explications sous les
  indicateurs du tableau de bord).

> Historique des couleurs : violet (départ) → bleu → **monochrome + accent bleu
> au focus** (état actuel). Si on doit rechanger la teinte d'accent, tout passe
> par la palette `violet-*` de `tailwind.config.ts` (nom conservé pour la compat,
> mais elle rend une autre couleur).

---

## 3. Pile technique

- Next.js 14 (App Router) + TypeScript + Tailwind CSS.
- **Backend : Supabase** (projet « L'Ecole des freelances », ref
  `bwocucqkdrlbeykikxeb`, région eu-central-2).
  - Client : `@supabase/supabase-js` + `@supabase/ssr`.
  - Helpers : `lib/supabase/client.ts` (navigateur) et `lib/supabase/server.ts`
    (serveur, cookies — pour l'auth à venir).
  - **Lecture des données : `lib/db.ts`** (client simple anon, contenu public via
    RLS `select using(true)`). Fonctions : `getCourses`, `getCourseById`,
    `getLiveSessions`, `getAssignments`, `getLeaderboard`, `getCommunityPosts`.
  - Tables (schéma public) : `profiles` (lié à `auth.users`), `courses`,
    `live_sessions`, `assignments`, `community_posts`, `leaderboard`. RLS activé
    partout ; contenu en lecture publique, `profiles` restreint à son
    propriétaire.
  - Env : `.env.local` → `NEXT_PUBLIC_SUPABASE_URL`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` (fichier gitignore).
  - Pages branchées sur la base : tableau-de-bord, mes-formations, live, devoirs,
    classement, communauté, détail cours. `lib/data.ts` reste pour les types +
    contenus non migrés (lessonCurriculum, categories, currentUser, catalogue
    listing masqué).
- **Auth : branchée (Supabase Auth, e-mail + mot de passe).**
  - Page unique épurée et centrée (`components/AuthForm.tsx`) avec bascule
    **Connexion / Créer un compte**. Routes `/connexion` et `/inscription`.
  - **`middleware.ts`** protège TOUT : non connecté → redirigé vers `/connexion` ;
    déjà connecté → `/connexion` et `/inscription` renvoient au tableau de bord.
  - Profil créé **automatiquement** à l'inscription (trigger
    `handle_new_user` sur `auth.users` → `public.profiles`).
  - Déconnexion branchée dans la sidebar (`supabase.auth.signOut()`).
  - **Garde-fou paiement (prêt) :** avant chaque inscription, l'app appelle la
    fonction SQL **`is_email_allowed(email)`** (aujourd'hui : renvoie `true`).
    Pour n'autoriser que les e-mails ayant payé : (1) le webhook de paiement
    insère l'e-mail dans la table **`allowed_emails`**, (2) on remplace le corps
    de `is_email_allowed` par `select exists(select 1 from public.allowed_emails
    where email = lower(p_email))`. **Aucun changement de code côté app requis.**
  - ⚠️ **Confirmation d'e-mail ACTIVÉE** dans Supabase par défaut → un nouveau
    compte doit cliquer le lien reçu par mail avant de pouvoir se connecter. Pour
    un accès **instantané** (recommandé ici, puisqu'on gate déjà par e-mail
    payé) : Dashboard Supabase → Authentication → Sign In / Providers → Email →
    désactiver « Confirm email ». (Non modifiable via l'outil MCP, action manuelle.)
  - Le profil affiché dans l'app (topbar, tableau de bord) est **encore
    `currentUser` fictif** — à remplacer par le profil connecté (prochaine étape).
- Lancement : node à un chemin custom —
  `export PATH="/Users/romeomoumouniattolou/node-v20.12.2-darwin-arm64/bin:$PATH"`
  puis `npm run dev` → **port 3002** (3000 = marketplace, 3001 = MonFuturBoulot).

---

## 4. Pages & navigation

Menu (sidebar) actuel :
- **Tableau de bord** (`/tableau-de-bord`)
- **Mes cours à suivre** (`/mes-formations`) — ex-« Mes formations »
- **Live** (`/live`) — sessions de coaching de groupe (voir §5)
- **Devoirs** (`/devoirs`)
- **Classement** (`/classement`)
- **Communauté** (`/communaute`)
- Réglages : **Paramètres** (`/parametres`), **Aide** (`/aide`)
- Auth : `/connexion`, `/inscription`

Pages présentes dans le code mais **masquées / retirées** :
- **Catalogue** (`/catalogue` + `/catalogue/[id]`) : **onglet masqué
  temporairement** (commenté dans `components/Sidebar.tsx`) — **à réactiver plus
  tard**. Les pages existent toujours ; le détail d'un cours reste accessible.
- **Certificats** : **supprimé** (onglet + page) — non pertinent pour ce modèle.

---

## 5. Décisions par page

- **Tableau de bord** : 4 indicateurs (voir §6), reprise du cours en cours, liste
  « Mes cours à suivre », bandeau motivation (carte claire), top du classement,
  devoirs à rendre.
- **Mes cours à suivre** : onglets En cours / Terminées / Toutes, progression
  globale.
- **Live** : bandeaux horizontaux annonçant les **coachings de groupe**. Chaque
  ligne : « Vous avez un coaching de groupe le [DATE] à [HEURE] avec le coach
  [NOM] sur le thème « … » ». Une session « En direct » a un bouton
  « Rejoindre le live ». Données dans `lib/data.ts` (`liveSessions`). **Plus tard,
  les coachs modifieront surtout la DATE depuis l'espace admin.**
- **Devoirs** : **uniquement les exercices à rendre** (on a retiré les cartes
  stats « Corrigés » / « Note moyenne » et le statut « corrigé »).
- **Classement** : podium top 3 + tableau, filtre Semaine / Mois / Tout le temps.
- **Communauté** : 3 **canaux** —
  1. **Annonces** (🔒 réservé aux administrateurs),
  2. **Publications régulières**,
  3. **Vos victoires du jour**.
- **Détail cours** : plus de prix → « Inclus dans votre programme ». Bouton
  « Commencer / Continuer la formation ». Progression conservée.
- **Paramètres** : Profil, Sécurité, Notifications, et « Mon accès » (programme
  actif, sans prix ni upsell).
- **Aide** : FAQ, sobre.

---

## 6. Les 4 indicateurs du tableau de bord

Chaque carte affiche une **petite explication en bas** (pour que l'élève
comprenne) :

| Indicateur | Valeur (démo) | Explication affichée |
|---|---|---|
| **Cours en cours** | 2 | Cours commencés mais pas encore terminés. |
| **Cours terminés** | 4 | Cours complétés à 100 %. |
| **Jours d'affilée** | 4 jours | Jours consécutifs où l'élève est actif. Un jour manqué remet à zéro (principe du *streak*). |
| **Classement** | #8 | Position parmi les élèves selon les points. |

---

## 7. Système de points & classement (CONÇU, pas encore codé)

**État : données fictives.** Aucun calcul automatique n'est branché pour le
moment. Barème proposé (à valider / ajuster par le client) :

| Action | Points |
|---|---|
| Terminer une leçon | +10 |
| Réussir un quiz | +20 |
| Rendre un exercice | +30 |
| Terminer un cours complet | +100 |
| Bonus « jours d'affilée » (par jour) | +5 |

**Calcul du classement :** somme des points par élève → tri décroissant. Le
filtre Semaine / Mois / Tout le temps ne compte que les points de la période. Mise
à jour automatique dès qu'un élève gagne des points.

**À faire pour rendre ça réel (plus tard) :**
1. Enregistrer chaque action de l'élève en base de données.
2. Calculer le total de points par élève.
3. Trier et afficher (l'interface est déjà prête à recevoir de vraies données).

Questions ouvertes : barème définitif ? garder les 3 périodes ou un seul
classement global ?

---

## 8. Reste à faire / à réactiver plus tard

- ~~Base de données~~ ✅ **fait (Supabase, cf. §3).**
- Brancher l'**authentification Supabase** (login/signup réels + `profiles` créé à
  l'inscription + protection des routes via middleware).
- Rendre `currentUser` (tableau de bord, topbar) **réel** = profil connecté.
- **Espace admin** : les coachs éditent les sessions Live (surtout la date) ; les
  admins publient les annonces. → écritures Supabase + RLS par rôle.
- Rendre la progression des cours **par utilisateur** (table `enrollments`) au
  lieu de la colonne `progress` de démo.
- Implémenter le **moteur de points & classement** réel (§7).
- Réactiver l'onglet **Catalogue**.
- (Optionnel) rendre les pages dynamiques en prod (`revalidate`) pour refléter la
  base sans rebuild — en dev c'est déjà live.

---

## 9. Pièges connus

- **Preview MCP verrouillé** sur le dossier de la marketplace : il ne sert pas ce
  projet voisin correctement (mauvaise config Tailwind). → **Vérifier via Bash**
  (`npm run dev` depuis ce dossier) + `curl`, pas via le Preview MCP.
- `node`/`npm` hors PATH : préfixer avec le chemin custom (voir §3).
