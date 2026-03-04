# Introductor

AI-powered warm email introductions. Research people, craft personalized intro emails, and draft them in your email client.

No one combines AI text generation + contextual research + email client integration for warm intros. Introductor does.

## What it does

1. **Researches** both people (web, email history, calendar, podcast episodes, etc.)
2. **Asks** you for personal context and tone preferences
3. **Generates** a warm, concise intro email with credibility nuggets and relevant links
4. **Drafts** it in your email client (Missive, Gmail, or copy-paste)

## Two ways to use it

### Claude Code skill

Install as a plugin in Claude Code. Use `/intro` or just describe an intro you want to make.

```bash
# Add the plugin
claude plugin add /path/to/introductor
```

The skill has access to your MCPs (email, calendar, Notion, etc.) for deeper research.

### Web app

Open `web/index.html` in your browser. No auth, no accounts, no data stored.

- Bring your own API key (Claude or OpenAI)
- Fill in who you're introducing and why
- Get a polished intro in seconds
- Copy to clipboard or open in your email client

```bash
# Serve locally
cd web && python3 -m http.server 3000
# Open http://localhost:3000
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
├── web/                                 # Standalone web app
└── .claude-plugin/plugin.json           # Plugin metadata
```

## License

MIT
