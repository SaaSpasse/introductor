# Introductor

## Projet

Outil AI pour générer des introductions chaleureuses par email. Deux surfaces: skill Claude Code + web app standalone.

## Ce qui est fait (session 1 - 2026-03-03)

### Research
- Deep research best practices intros email (Fred Wilson double opt-in, Alex Iskold forwardable email, BCC protocol, stats response rates)
- Analyse compétitive complète: aucun outil ne combine génération AI + recherche contextuelle + draft email client. Bridge (brdg.app) fait le workflow pas la rédaction. WriteCream/Jenova font du texte générique.

### Skill Claude Code
- `skills/introductor/SKILL.md` - workflow complet en 5 étapes (collecte → recherche → questions → génération → draft)
- `skills/introductor/references/best-practices.md` - research compilée
- `skills/introductor/references/templates.md` - 5 templates + patterns
- `commands/intro.md` - slash command `/intro` (seul point d'entrée, symlinké dans `~/.claude/commands/`)
- `.claude-plugin/plugin.json` - metadata plugin
- Auto-trigger skill retiré (session 6) - `/intro` est explicite, pas besoin d'auto-détection

### Web app
- `web/index.html` + `web/style.css` + `web/app.js`
- BYOK (Anthropic ou OpenAI), zéro auth, zéro stockage
- Formulaire: Person A, Person B, why, personal touch, tone, language, your name
- Output: preview + Copy + Open in email (mailto:) + Regenerate
- Responsive mobile, charte couleurs SaaSpasse

### POC validé
- Intro Derek Morin (Poche et Fils) ↔ Émile David (Sainte-Pax) + Olivier Côté-Méthot (Meto)
- Flow complet: recherche web automatique → questions à Frank → draft → Missive
- Trouvé email Derek via Google Calendar (derek@pochesetfils.com)
- Épisode SaaSpasse ep. 98 + On R'dress Ça Ép. 07 (YouTube: LajrMfDMuoc)
- Draft créé dans Missive (conversation aa591ffe-9e10-4618-bd5e-f74c838b15ae)

## Ce qui est fait (session 2 - 2026-03-03)

### Infrastructure
- Repo GitHub: https://github.com/SaaSpasse/introductor
- Deploy Vercel: https://introductor.vercel.app
- CORS testé: `anthropic-dangerous-direct-browser-access` fonctionne, pas besoin de proxy
- Skill installé: symlinks `~/.claude/commands/intro.md` + `~/.claude/skills/introductor/`

## Ce qui est fait (session 3 - 2026-03-04)

### Redesign complet web app - flow Typeform + free tier
- Flow wizard 5 étapes (1 question à la fois, transitions CSS translateY 250ms)
- Answer piping: "Why connect Sarah and Mike?" (extraction prénoms)
- Free tier via edge function (`api/generate.js`) - rate limit 5/jour par IP
- BYOK mode retiré (free tier seulement maintenant)
- Design terminal-core: monospace, noir/blanc/gris, minimaliste
- Pills pour tone (Casual/Warm pro/Formal) et language (EN/FR)
- Output contenteditable (modifiable avant copie)
- Actions: Copy all, Copy subject, Open in email (mailto), Regenerate, Start over
- localStorage: sauvegarde chaque keystroke + step courant, auto-resume
- Streaming SSE avec curseur clignotant pendant génération
- Responsive mobile testé
- Vercel: Root Directory = `web/`, CI/CD Git auto, env var ANTHROPIC_API_KEY configurée

## Ce qui est fait (session 4 - 2026-03-04)

### Brave Search + Sonnet + design fusion
- Brave Search intégré dans `api/generate.js`: recherche auto LinkedIn/profils pour les 2 personnes
- Recherches en parallèle (Promise.all), fallback gracieux si pas de clé ou si erreur
- Modèle passé de Haiku à Sonnet 4.5 (`claude-sonnet-4-5-20250929`) - meilleure rédaction
- Nouveau SSE protocol: 7 event types (search_start, search_result, writing, text, subject, done, error)
- Research phase UX: animations séquentielles (dot pulse → found bounce → writing → fade out)
- Subject line extraite séparément du stream Anthropic (buffering jusqu'au premier newline)
- 9 thèmes CSS explorés, fusion `theme-final.css` créée (Fraunces + Inter + dusty rose #B5706A)
- Compte Brave Search API créé et vérifié (francois@saaspasse.com)
- Testé end-to-end: wizard + Sonnet OK, search skippé gracefully (pas de BRAVE_API_KEY encore)

## Ce qui est fait (session 5 - 2026-03-04)

### Brave Search live + UX polish + hero screen
- Clé API Brave créée (plan $5 free/mois) — clé dans Vercel env vars uniquement
- `BRAVE_API_KEY` ajoutée dans Vercel env vars
- Thème fusion appliqué comme défaut, theme switcher retiré
- Testé end-to-end avec vraies personnes (Derek Morin / Émile David)
- Fix: boutons output qui overlappaient le texte (flex layout fix)
- Écran hero (step 0) avec value prop + "Get started" + Enter
- Navigation flèches haut/bas entre steps
- Reset au step 0 au refresh (données préservées en localStorage)
- Research phase: délais séquentiels (800ms/1000ms/600ms), box stylée, animations
- Champs email A/B optionnels au step 4, utilisés dans mailto:
- Subject line word-break fix
- Streaming typewriter (2 chars/18ms) + auto-scroll
- Promo Claude Code skill après génération (fade-in)

## Ce qui est fait (session 6 - 2026-03-07)

### Audit + 13 fixes
- Audit complet code + UX/UI (browser automatisé)
- overflow: hidden → overflow-y: auto sur .step-output
- CORS restreint à introductor.ai + introductor.vercel.app + localhost:3000
- Rate limit in-memory supprimé (inutile sur Edge stateless, CORS protège partiellement)
- 9 fichiers CSS dead supprimés (-1915 lignes)
- Arrow keys ne mangent plus le curseur dans les champs input
- Bouton Generate affiche "Generating..." pendant le travail
- README mis à jour (plus de BYOK)
- Meta tags ajoutés (title, description, OG, emoji favicon)
- Modèle mis à jour vers claude-sonnet-4-5-latest
- window.location.assign() pour mailto
- Ctrl+Enter sur Windows, Cmd+Enter sur Mac
- for attributes sur labels + aria-label sur inputs
- Empty name → validation avec shake, bloque la génération

### DNS + domaine custom
- DNS introductor.ai configuré sur iwantmyname (A @ → 76.76.21.21, CNAME www → cname.vercel-dns.com)
- Site live sur https://introductor.ai

## Ce qui est fait (session 7+8 - 2026-03-07)

### P0 - Rate limit Upstash Redis
- Upstash Redis via Vercel marketplace (DB: introductor-ratelimit, plan Free 500K cmd/mois)
- 5 req/jour par IP, sliding window INCR + EXPIRE 24h
- Fail open si Redis indisponible

### P1 - Voice input (Web Speech API)
- Bouton mic SVG en bas-droite des textareas (steps 1-3)
- Web Speech API avec continuous + interimResults
- Pulse accent pendant écoute, langue auto (en-US/fr-CA selon state)
- Feature detection: caché si navigateur ne supporte pas

### P1.5 - Share as link
- POST /api/share → ID court 7 chars, stocké Redis TTL 30 jours
- GET /i/:id → page HTML branded standalone (rewrite Vercel)
- Bouton "Share as link" dans output-actions
- Page 404 si lien expiré

### P2 - Skill enrichi
- SKILL.md: instructions Calendar search, Missive/Gmail history, Notion
- `introductor.config.json` avec defaults (tone, language, email client, search sources)

### P3 - Polish
- "Try an example" sur hero → pré-remplit exemple SaaS/tech → step 4
- Compteur Redis `stats:total_intros` dans generate.js
- GET /api/stats + footer dynamique

### Fix model ID
- `claude-sonnet-4-5-latest` → `claude-sonnet-4-5-20250929` (le latest alias n'existe pas sur l'API)

### Bugs trouvés (pas encore fixés)
- Transitions entre steps glitchées (steps se chevauchent)
- "Open in email" (mailto:) ne fonctionne pas
- "Share as link" bouton UI échoue côté client (API fonctionne)
- Footer compteur pas visible (0 → omis?)
- UX du share link à repenser: actuellement c'est juste un email dans une page web. Pistes: view tracking à la Loom, connection card personnalisée, notifications

## Vision produit

### Pourquoi
- Plus-value pour les SaaSpals (subscribers communauté SaaSpasse) et l'audience SaaSpasse
- Apprendre à builder un produit AI-native (learning vehicle)
- Utilisation perso quand Frank en a besoin
- Contenu SaaSpasse (podcast, infolettre, LinkedIn) autour du build en public

### Roadmap

#### P0 - Rate limit - DONE (session 7)
#### P1 - Voice input - DONE (session 8) - bugs à fixer
#### P1.5 - Share as link - DONE (session 8) - UX à repenser
#### P2 - Skill enrichi - DONE (session 8)
#### P3 - Polish - DONE (session 8) - bugs à fixer

#### P-next - Fix bugs session 8
- Transitions entre steps
- Open in email
- Share link bouton UI
- Footer compteur

#### P-next - Repenser Share link UX
- View tracking à la Loom (qui a ouvert le lien)
- Connection card personnalisée par destinataire
- Notification à l'introducteur

#### P4 - Distribution
1. Landing page / Product Hunt
2. Contenu SaaSpasse: "builder un produit AI en X jours avec Claude Code"

## Stack technique
- Skill: markdown (SKILL.md) + slash command
- Web app: HTML/CSS/JS vanilla, zéro framework, zéro DB
- Backend: Vercel Edge Function (`api/generate.js`) → Brave Search + Anthropic Sonnet 4.5
- Modèle: `claude-sonnet-4-5-latest` (max_tokens: 1024, ~0.01$/intro)
- Search: Brave Search API (linkedin enrichment, top 3 snippets, 300 chars summary)
- Rate limit: Upstash Redis (5 req/jour par IP, plan Free, fail open)
- Deploy: Vercel (https://introductor.vercel.app + https://introductor.ai), CI/CD Git auto, root dir `web/`
- Domaine: introductor.ai (iwantmyname, DNS A + CNAME vers Vercel)
- Repo: https://github.com/SaaSpasse/introductor
- Env vars Vercel: `ANTHROPIC_API_KEY`, `BRAVE_API_KEY`
- Compte Brave: francois@saaspasse.com, plan Search ($5 free credits/mois), usage limit $5

## Contacts POC
- Derek Morin: derek@pochesetfils.com (Poche et Fils, C'est beau, ex-Tabarnapp)
- Émile David: emile@saintepax.com (Sainte-Pax Productions)
- Olivier Côté-Méthot: olivier@saaspasse.com (technicien audio + artiste Meto)
