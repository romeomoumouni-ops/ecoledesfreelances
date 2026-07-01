# L'École des Freelances — Plateforme (interfaces)

Plateforme de formation en ligne (LMS) inspirée du dashboard « Skillery ».
Projet **séparé** de la marketplace `recrutefreelance`. Ce sont des **interfaces /
templates** avec des données fictives (`lib/data.ts`), prêtes à être branchées
sur une vraie API/base de données plus tard.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Police : **Montserrat**
- Icônes : **SVG** inline (`components/Icons.tsx`, zéro emoji décoratif)
- Couleur principale : **violet** (palette dans `tailwind.config.ts`)

## Lancer
```bash
npm install
npm run dev   # http://localhost:3002
```

## Pages
| Route | Description |
|---|---|
| `/tableau-de-bord` | Accueil élève : stats, reprise de formation, top classement |
| `/mes-formations` | Formations en cours / terminées (onglets, progression) |
| `/catalogue` | Catalogue avec recherche + filtres par catégorie |
| `/catalogue/[id]` | Détail d'une formation : programme, objectifs, inscription |
| `/lecon` | Lecteur de leçon : vidéo, onglets, programme latéral |
| `/devoirs` | Devoirs à rendre / corrigés |
| `/certificats` | Certificats téléchargeables |
| `/classement` | Leaderboard (podium + tableau) |
| `/communaute` | Fil communautaire + canaux |
| `/parametres` | Profil, sécurité, notifications, abonnement |
| `/aide` | Centre d'aide (FAQ) |
| `/connexion`, `/inscription` | Authentification |

## Structure
- `components/AppShell.tsx` — sidebar + topbar (layout `(app)`)
- `components/Sidebar.tsx`, `Topbar.tsx`, `Logo.tsx`, `Avatar.tsx`
- `components/UI.tsx` — `CourseCard`, `StatCard`, `Badge`, `ProgressBar`, etc.
- `components/Icons.tsx` — toutes les icônes SVG
- `lib/data.ts` — données fictives à remplacer
