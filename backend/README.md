# API DevHub Africa

Backend de la plateforme : **actualités réelles agrégées**, **vidéos**, **connexion OAuth** (GitHub, GitLab, Google), proxy d'images.

## Lancer en local

```bash
cd backend
npm install
npm run dev          # API sur http://127.0.0.1:8787, collecte des actus toutes les 15 min
```

Dans un autre terminal : `cd frontend && npm run dev` (Vite proxifie `/api` vers le port 8787).

Sans `DATABASE_URL`, l'API utilise **PGlite** (PostgreSQL embarqué, fichiers dans `.data/`) : rien à installer.
En production, renseigner `DATABASE_URL` : le même SQL tourne sur PostgreSQL.

`npm run ingest` lance une collecte complète à la main et affiche le nombre d'éléments par type.

## Ce que l'API collecte (sources réelles, vérifiées)

| Type | Sources |
|---|---|
| Articles (RSS/Atom) | OpenAI, Google AI, DeepMind, Hugging Face, The Verge, TechCrunch, MIT Tech Review, Simon Willison, Ars Technica, Wired, Engadget, Numerama, 01net, Journal du Geek, Korben, Le Monde Informatique, 9to5Mac, MacRumors, Apple Newsroom, 9to5Google, Android Authority, Google Blog, SamMobile, Samsung Newsroom, Frandroid, Phonandroid, GitHub Blog, Smashing Magazine, Stack Overflow Blog, Chrome for Developers, Cloudflare, TechCabal |
| Vidéos (flux YouTube publics) | Fireship, Theo, ThePrimeTime, ByteByteGo, freeCodeCamp, Google for Developers, VS Code, GitHub, NetworkChuck, Anthropic, OpenAI, Hugging Face, Two Minute Papers, MKBHD, Mrwhosetheboss, Linus Tech Tips, The Verge, Grafikart, Micode, Underscore_, Cocadmin, Benjamin Code, Melvynx… |
| API | Hacker News (top), DEV Community (top de la semaine), GitHub (dépôts de la semaine, dernières versions de 24 projets majeurs) |

La liste complète est dans `src/news/sources.ts` et visible dans l'app sur `/sources`.
On publie **le titre, un court extrait et le lien** vers l'article d'origine ; les contenus commerciaux (« deals », promos) sont écartés.

## Routes

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/health` | État, nombre d'éléments, dernière collecte, fournisseurs OAuth configurés |
| GET | `/api/news/home?lang=fr\|en\|all` | Accueil : à la une, rubriques, vidéos, Hacker News, DEV, dépôts, versions |
| GET | `/api/news?category=&kind=&lang=&q=&before=&limit=` | Liste filtrée et paginée |
| GET | `/api/videos?category=&lang=&limit=` | Vidéos |
| GET | `/api/news/sources` | Sources et volumes |
| GET | `/api/img?u=&w=` | Image redimensionnée en WebP, mise en cache (anti-SSRF) |
| GET | `/api/auth/providers` | Fournisseurs configurés |
| GET | `/api/auth/:provider` | Démarre la connexion (github, gitlab, google) |
| GET | `/api/auth/:provider/callback` | Retour OAuth, ouvre la session (cookie HttpOnly) |
| GET | `/api/me` | Utilisateur connecté |
| POST | `/api/auth/logout` | Ferme la session |

## Activer les connexions GitHub, GitLab et Google

Voir `.env.example` : chaque fournisseur demande de créer une application OAuth (2 minutes) et de copier l'identifiant et le secret.
Tant qu'un fournisseur n'est pas configuré, le bouton correspondant reste désactivé et GitHub passe par l'import du profil public.

## Sécurité

- Secrets uniquement en variables d'environnement ; `state` OAuth à usage unique (10 min) ; redirections limitées aux chemins internes.
- Sessions par cookie HttpOnly, SameSite=Lax, Secure en production, 30 jours.
- Paramètres validés (zod) ; proxy d'images limité aux adresses publiques, 15 Mo max.
