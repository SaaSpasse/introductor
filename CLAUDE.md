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
- Free tier via edge function (`api/generate.js`) - Haiku 4.5, rate limit 5/jour par IP
- BYOK mode inchangé (Anthropic + OpenAI, streaming direct)
- Design terminal-core: monospace, noir/blanc/gris, minimaliste
- Pills pour tone (Casual/Warm pro/Formal) et language (EN/FR)
- Output contenteditable (modifiable avant copie)
- Actions: Copy all, Copy subject, Open in email (mailto), Regenerate, Start over
- localStorage: sauvegarde chaque keystroke + step courant, auto-resume
- Streaming SSE avec curseur clignotant pendant génération
- Responsive mobile testé
- Vercel: Root Directory = `web/`, CI/CD Git auto, env var ANTHROPIC_API_KEY configurée
- Fix prompt: plain text au lieu de markdown dans le output

### Fichiers modifiés/créés
- `web/api/generate.js` (nouveau - serverless function)
- `web/index.html` (rewrite - wizard 5 écrans)
- `web/style.css` (rewrite - transitions, pills, streaming)
- `web/app.js` (rewrite - state machine, 3 parsers streaming)
- `web/vercel.json` (update - functions config)

## Ce qui reste à faire

### P0
1. Tester `/intro` end-to-end dans une nouvelle session Claude Code
2. Valider le mailto: link (encoding des caractères spéciaux FR)

### P1 - Améliorer le skill
1. Ajouter la config `introductor.config.json` pour que le skill soit configurable (email client, sources, ton, langue)
2. Ajouter le search Google Calendar dans le workflow de recherche (trouvé l'email de Derek là)
3. Ajouter le search Missive conversations dans le workflow
4. Ajouter le search Notion podcast database dans le workflow
5. Tester avec un cas d'intro standard 1↔1 (pas 1→group)

### P2 - Améliorer la web app
1. Ajouter un mode "preview email" avec formatting HTML (pas juste du texte)
2. Ajouter des exemples pré-remplis (bouton "Try an example")
3. Ajouter un compteur de mots live sur le output

### P3 - Distribution
1. Publier le plugin sur un registry si applicable
2. Landing page / Product Hunt
3. Custom GPT pour ChatGPT users

## Stack technique
- Skill: markdown (SKILL.md) + slash command
- Web app: HTML/CSS/JS vanilla, zéro framework, zéro DB
- Free tier: Vercel serverless function (`api/generate.js`) → Anthropic API (Haiku 4.5)
- BYOK: appels directs Claude (Haiku) ou OpenAI (GPT-4o-mini) depuis le browser
- Rate limit: 5/jour par IP (in-memory Map, ~0.001$/intro)
- Deploy: Vercel (https://introductor.vercel.app), CI/CD Git auto, root dir `web/`
- Repo: https://github.com/SaaSpasse/introductor
- Env var Vercel: `ANTHROPIC_API_KEY` (clé nommée "introductor" sur console Anthropic)

## Contacts POC
- Derek Morin: derek@pochesetfils.com (Poche et Fils, C'est beau, ex-Tabarnapp)
- Émile David: emile@saintepax.com (Sainte-Pax Productions)
- Olivier Côté-Méthot: olivier@saaspasse.com (technicien audio + artiste Meto)
