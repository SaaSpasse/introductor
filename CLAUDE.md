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
- `commands/intro.md` - slash command /intro
- `.claude-plugin/plugin.json` - metadata plugin

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

## Ce qui reste à faire

### P0 - Immédiat
1. Créer la clé API Brave dans le dashboard (https://api-dashboard.search.brave.com)
2. Ajouter `BRAVE_API_KEY` dans Vercel env vars (Settings → Environment Variables)
3. Tester avec search actif (voir les animations research phase en live)
4. Choisir le thème final (theme-final.css pas encore par défaut, accessible via `?theme=final`)

### P1 - Skill + web app
1. Tester `/intro` end-to-end dans une nouvelle session Claude Code
2. Config `introductor.config.json` (email client, sources, ton, langue)
3. Ajouter search Calendar/Missive/Notion dans le workflow du skill

### P2 - Polish web app
1. Exemples pré-remplis (bouton "Try an example")
2. Compteur de mots live sur le output
3. Preview email avec formatting HTML

### P3 - Distribution
1. Landing page / Product Hunt
2. Custom GPT pour ChatGPT users

## Stack technique
- Skill: markdown (SKILL.md) + slash command
- Web app: HTML/CSS/JS vanilla, zéro framework, zéro DB
- Backend: Vercel Edge Function (`api/generate.js`) → Brave Search + Anthropic Sonnet 4.5
- Modèle: `claude-sonnet-4-5-20250929` (max_tokens: 1024, ~0.01$/intro)
- Search: Brave Search API (linkedin enrichment, top 3 snippets, 300 chars summary)
- Rate limit: 5/jour par IP (in-memory Map)
- Deploy: Vercel (https://introductor.vercel.app), CI/CD Git auto, root dir `web/`
- Repo: https://github.com/SaaSpasse/introductor
- Env vars Vercel: `ANTHROPIC_API_KEY`, `BRAVE_API_KEY` (à ajouter)
- Compte Brave: francois@saaspasse.com (vérifié, clé API à créer)

## Contacts POC
- Derek Morin: derek@pochesetfils.com (Poche et Fils, C'est beau, ex-Tabarnapp)
- Émile David: emile@saintepax.com (Sainte-Pax Productions)
- Olivier Côté-Méthot: olivier@saaspasse.com (technicien audio + artiste Meto)
