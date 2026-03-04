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

## Ce qui reste à faire

### P0 - Valider et fixer
1. Tester la web app live avec une clé API (vérifier que les appels Anthropic/OpenAI fonctionnent)
2. Tester le CORS - l'appel direct à api.anthropic.com depuis le browser nécessite `anthropic-dangerous-direct-browser-access` header
3. Installer le plugin dans Claude Code et tester `/intro` end-to-end
4. Valider le mailto: link (encoding des caractères spéciaux FR)

### P1 - Améliorer le skill
1. Ajouter la config `introductor.config.json` pour que le skill soit configurable (email client, sources, ton, langue)
2. Ajouter le search Google Calendar dans le workflow de recherche (trouvé l'email de Derek là)
3. Ajouter le search Missive conversations dans le workflow
4. Ajouter le search Notion podcast database dans le workflow
5. Tester avec un cas d'intro standard 1↔1 (pas 1→group)

### P2 - Améliorer la web app
1. Ajouter un mode "preview email" avec formatting HTML (pas juste du texte)
2. Gérer le CORS proprement (proxy serverless Vercel si nécessaire)
3. Ajouter des exemples pré-remplis (bouton "Try an example")
4. Ajouter un compteur de mots live sur le output
5. Dark mode optionnel
6. Deploy sur Vercel

### P3 - Distribution
1. Créer un repo GitHub public (org SaaSpasse ou perso)
2. Publier le plugin sur un registry si applicable
3. Landing page / Product Hunt
4. Custom GPT pour ChatGPT users

## Stack technique
- Skill: markdown (SKILL.md) + slash command
- Web app: HTML/CSS/JS vanilla, zéro framework, zéro DB
- API: appels directs Claude (Haiku) ou OpenAI (GPT-4o-mini)
- Deploy prévu: Vercel (gratuit)

## Contacts POC
- Derek Morin: derek@pochesetfils.com (Poche et Fils, C'est beau, ex-Tabarnapp)
- Émile David: emile@saintepax.com (Sainte-Pax Productions)
- Olivier Côté-Méthot: olivier@saaspasse.com (technicien audio + artiste Meto)
