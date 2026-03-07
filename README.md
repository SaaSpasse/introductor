# Introductor

AI-powered warm email introductions. Research people, craft personalized intro emails, and draft them in your email client.

No one combines AI text generation + contextual research + email client integration for warm intros. Introductor does.

## What it does

1. **Researches** both people (web search via Brave, plus email history, calendar, etc. via Claude Code skill)
2. **Asks** you for personal context and tone preferences
3. **Generates** a warm, concise intro email with credibility nuggets and relevant links
4. **Drafts** it in your email client (Missive, Gmail, or copy-paste)

## Two ways to use it

### Web app (free)

Open [introductor.vercel.app](https://introductor.vercel.app). No auth, no accounts, no data stored.

- Fill in who you're introducing and why
- Pick a tone (casual, warm pro, formal) and language (EN/FR)
- Get a polished intro in seconds
- Copy to clipboard or open in your email client

### Claude Code skill

Use `/intro` in Claude Code for deeper research using your MCPs (email, calendar, Notion, etc.).

```bash
# The skill reads from ~/claude-code/introductor/skills/introductor/SKILL.md
/intro Derek Morin and Émile David — video production collab
```

## Best practices encoded

Based on research from Fred Wilson, Mark Suster, Alex Iskold, and others:

- **Double opt-in** - always get permission from both parties first
- **Brevity** - 100-150 words max, scannable in 15 seconds
- **Nuggets, not CVs** - 1-2 credibility data points per person
- **One link per person** - LinkedIn, site, podcast, or article
- **BCC reminder** - always invite recipients to move you to BCC
- **Smart subject lines** - specific, not "Introduction"

## Structure

```
introductor/
├── skills/introductor/SKILL.md          # Core skill logic
├── skills/introductor/references/       # Best practices & templates
├── commands/intro.md                    # /intro slash command
├── web/                                 # Web app (Vercel)
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── api/generate.js                  # Edge Function (Brave + Sonnet)
└── .claude-plugin/plugin.json           # Plugin metadata
```

## Tech

- Vanilla HTML/CSS/JS (no framework)
- Vercel Edge Function backend
- Claude Sonnet 4.5 for generation
- Brave Search API for LinkedIn enrichment
- SSE streaming with typewriter effect

## License

MIT
