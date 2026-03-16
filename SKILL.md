# News Watcher — Real-time Crypto News Monitor

Monitors CoinDesk (or PANews) for new articles using Playwright with your local Chrome browser. When a new article is detected, automatically fetches the full text, summarizes it with your OpenClaw Agent, and sends it to Telegram.

**No API keys. No login. Works with publicly accessible pages.**

## Quick Start

```bash
# Set required env var
export TELEGRAM_CHAT_ID="your_telegram_chat_id"

# Run
node {baseDir}/scripts/watch-news.js --site coindesk --interval 60
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--site` | string | `coindesk` | Site to monitor (`coindesk` or `panews`) |
| `--interval` | number | `60` | Check interval in seconds |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_CHAT_ID` | ✅ Yes | Telegram chat ID for notifications |
| `OPENCLAW_MJS` | Optional | Path to openclaw.mjs (auto-detected) |
| `CHROME_PATH` | Optional | Path to Chrome (auto-detected by OS) |
| `OPENCLAW_AGENT_ID` | Optional | Agent ID for summarization (default: `main`) |
| `PLAYWRIGHT_HEADLESS` | Optional | Set to `false` to show browser window |

## How It Works

1. **Hash-based detection** — hashes the top article URL each cycle
2. **On change** — navigates into the article page, extracts full text
3. **Summarize** — calls OpenClaw Agent with the article text
4. **Notify** — sends summary + link to Telegram via `openclaw message send`

## Cache

Hash state is stored at `~/.openclaw/cache/news-hash.json`.  
Delete this file to force a fresh start (will re-send the current top article).

## Supported Sites

| Site | `--site` value |
|------|----------------|
| CoinDesk (Chinese) | `coindesk` |
| PANews | `panews` |

## GitHub

Full source code and issue tracker: https://github.com/YOUR_USERNAME/news-watcher-openclaw

> ⚠️ Script files in this skill package are provided as `.txt` for ClawHub review transparency.  
> Original `.js` source is available on GitHub (link above).
