# FlagshipRouter

**Free AI models for every coding tool.** FlagshipRouter is a local AI gateway that connects Claude Code, Codex, Cursor, Cline, OpenCode and other coding tools to free AI models through one OpenAI-compatible endpoint.

- **Free providers only.** The dashboard, management APIs and routing only expose providers with a free offer (Kiro, OpenCode Free, OpenRouter free models, NVIDIA NIM, Groq, Cloudflare Workers AI, Ollama, self-hosted servers and more).
- **A Models screen instead of a provider list.** Every model from every free provider in one searchable table, with a ready/connect status and a one-click test.
- **Starts with one command.** Running `flagshiprouter` starts the server and opens the browser UI.

## Quick start

Requires Node.js 20.9 or newer (22 recommended).

```bash
git clone https://github.com/yazanus94-dot/FlagshipRouter.git
cd FlagshipRouter
npm run launch
```

`npm run launch` installs the dependencies, builds the app (a few minutes, first run only), and starts the CLI. The server runs on port `20128` and the dashboard opens in your browser; the terminal keeps a small menu (open browser UI, terminal UI, hide to tray, exit).

`npm run launch` also installs the [OpenCode](https://opencode.ai) CLI (by [SST](https://github.com/sst/opencode), MIT) quietly in the background if you don't have it.

Pass CLI options after `--`, for example `npm run launch -- --host 127.0.0.1` (local only), `-- -p 20130` (another port) or `-- --no-browser`.

### Local models (no signup, no limits)

When the free cloud models hit their limits, GPT-6 Astra and Claude Opus 5.5 fall back to a model running on your own machine.

- **Ollama:** install it from [ollama.com](https://ollama.com), then run `ollama pull qwen3:8b` (or any model you like). FlagshipRouter detects it on `localhost:11434` automatically.
- **LM Studio:** load a model and start its local server on port 1234. It is detected automatically too.
- **Anything else** with an OpenAI- or Anthropic-compatible API (llama.cpp, vLLM, Jan, LocalAI, another machine on your network): add it under **Providers → Add custom endpoint** and pick its default model.

To use the `flagshiprouter` command anywhere, link the CLI package once:

```bash
cd cli && npm link
```

For development with hot reload:

```bash
npx next dev --port 20128
```

The dashboard's default password is `123456`; change it under **Settings** before exposing the router beyond localhost.

## Connect a coding tool

1. Open **Endpoint & Key** and create an API key.
2. Open **Models**, pick a model marked **Ready** (OpenCode Free models need no signup) or connect a provider to unlock more.
3. Point your tool at `http://localhost:20128/v1` with that key, or use **CLI Tools** to write the config for Claude Code, Codex, OpenCode, Cline, Copilot and others. Models appear in those tools as `flagshiprouter/<model>`.

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $FLAGSHIPROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-6-astra", "messages": [{"role": "user", "content": "Hello"}]}'
```

## Free-provider policy

```json
"providers": {
  "freeOnly": true,
  "categories": ["free", "freeTier"],
  "includeHasFree": true,
  "include": [],
  "exclude": ["antigravity", "gemini", "gemini-cli"],
  "customEndpoints": false
}
```

A provider is available when its registry entry (`open-sse/providers/registry/<id>.js`) has a listed `category`, or is flagged `hasFree` and `includeHasFree` is on. `include` and `exclude` take provider ids. The policy is enforced in the dashboard, the management APIs, the connection store and at routing time. `customEndpoints` enables user-defined OpenAI/Anthropic-compatible endpoints; setting `freeOnly` to `false` restores the full upstream provider list.

## Screens

Endpoint & Key · Models · Combos & Vision · Token Saver · CLI Tools · Media Models (embedding, image, video, speech, transcription, System One, web fetch & search) · Agent Skills · Proxy Pools · Console Log · Translator · Settings. Usage and Quota Tracker pages are still available at `/dashboard/usage` and `/dashboard/quota`.

## Project layout

| Path | What it is |
| --- | --- |
| `src/app/` | Next.js dashboard and API routes (`/v1/*` gateway, `/api/models/catalog` for the Models screen) |
| `cli/` | The `flagshiprouter` launcher: starts the server, opens the browser UI, terminal UI, tray |
| `open-sse/` | Shared SSE/routing core: executors, translators, provider registry, fallback logic |
| `tests/` | Vitest suite (`tests/unit/brand-policy.test.js` covers the brand layer) |
| `docs/ARCHITECTURE.md` | Request lifecycle and data model |

## Architecture Overview

FlagshipRouter is a local AI routing gateway and dashboard built on Next.js. It provides a single OpenAI-compatible endpoint (`/v1/*`) and routes traffic across multiple upstream providers with translation, fallback, token refresh, and usage tracking.

### Core Capabilities

- OpenAI-compatible API surface for CLI/tools
- Request/response translation across provider formats (OpenAI, Anthropic, Gemini, etc.)
- Model combo fallback (multi-model sequence)
- Account-level fallback (multi-account per provider)
- OAuth + API-key provider connection management
- Local persistence for providers, keys, aliases, combos, settings, pricing
- Usage/cost tracking and request logging
- Optional cloud sync for multi-device/state sync

### Request Lifecycle (`/v1/chat/completions`)

```
Client → Next.js Route → Chat Handler → Model Resolver → Credential Selector
  → Provider Executor → Upstream Provider → Stream Translator → Client
                    ↓
              Usage Tracking (persisted to local DB)
```

### Technology Stack

- **Runtime:** Node.js 20.9+ (22 recommended)
- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** Plain JavaScript (ESM), no TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** JSON file-based (SQLite optional via `better-sqlite3` or `sql.js`)
- **Testing:** Vitest 4
- **Containerization:** Docker (multi-platform: linux/amd64 + linux/arm64)
- **CI/CD:** GitHub Actions (Docker publish, tray binary builds)

## Installation

### Prerequisites

- Node.js 20.9 or newer (22 recommended)
- npm 10+ (bundled with Node.js)
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/yazanus94-dot/FlagshipRouter.git
cd FlagshipRouter

# Install dependencies
npm install

# Build the application
npm run build

# Start development server with hot reload
npm run dev

# Or start production build
npm run start
```

### Docker

```bash
# Quick start
docker run -d \
  -p 20128:20128 \
  -v "$HOME/.flagshiprouter:/app/data" \
  -e DATA_DIR=/app/data \
  --name flagshiprouter \
  ghcr.io/yazanus94-dot/flagshiprouter:latest
```

See [DOCKER.md](DOCKER.md) for full Docker documentation including multi-platform builds and publishing.

### CLI Installation

```bash
cd cli && npm link
# Now 'flagshiprouter' command is available globally
```

## Configuration

### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `JWT_SECRET` | Secret for dashboard session cookies | **Required** |
| `INITIAL_PASSWORD` | Initial dashboard password | **Required** |
| `DATA_DIR` | Data directory path | `~/.flagshiprouter/` |
| `PORT` | Server port | `20128` |
| `HOSTNAME` | Bind hostname | `0.0.0.0` |
| `NODE_ENV` | Environment | `production` |
| `API_KEY_SECRET` | HMAC secret for API keys | Required for key gen |
| `MACHINE_ID_SALT` | Salt for machine ID | Required for key gen |
| `NEXT_PUBLIC_BASE_URL` | Public base URL | `http://localhost:20128` |
| `REQUIRE_API_KEY` | Require API key for `/v1/*` | `false` |

See [.env.example](.env.example) for a complete list with descriptions.

### Brand Configuration

All product branding is centralized in [`brand.json`](brand.json). Run `npm run brand:sync` after editing to update derived files.

## API Usage Examples

### Chat Completions (OpenAI Format)

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $FLAGSHIPROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-6-astra",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### List Models

```bash
# Chat models
curl http://localhost:20128/v1/models

# Image generation models
curl http://localhost:20128/v1/models/image

# Embeddings
curl http://localhost:20128/v1/models/embedding

# Text-to-speech
curl http://localhost:20128/v1/models/tts
```

### Health Check

```bash
curl http://localhost:20128/api/health
# {"ok":true}
```

## Security Considerations

- **Dashboard authentication:** Cookie-based sessions signed with `JWT_SECRET`
- **API key generation:** HMAC-signed keys using `API_KEY_SECRET`
- **Provider secrets:** Stored in local database (`db.json`) — protect at filesystem level
- **Default password:** `123456` — **must be changed** before exposing beyond localhost
- **Request logging:** When `ENABLE_REQUEST_LOGS=true`, full headers/body are written to disk — treat log directory as sensitive
- **Outbound proxy:** Supports `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY` env vars
- **Cloud sync:** Optional; relies on API key auth + machine ID semantics

## Testing

```bash
# Install test dependencies (isolated from main project)
npm install --prefix /tmp/vitest-runner --legacy-peer-deps vitest@4
ln -sfn /tmp/vitest-runner/node_modules tests/node_modules
cd tests && npx vitest run
```

**Note:** The test suite carries known failures (live-provider tests, a missing `cloud/` worker, timing-sensitive DB tests). Compare against a run on the previous commit rather than expecting all green. Engine tests run with the free-only policy disabled by `tests/setup/providerPolicy.js`.

## Project Structure

```
FlagshipRouter/
├── .github/workflows/       # CI/CD: docker-publish, tray-binaries
├── cli/                     # CLI launcher package
│   ├── src/                 # CLI source code
│   ├── hooks/               # Post-install hooks
│   └── scripts/             # Build scripts
├── docs/
│   └── ARCHITECTURE.md      # Detailed architecture documentation
├── open-sse/                # Shared SSE/routing core
│   ├── executors/           # Provider-specific executors
│   ├── handlers/            # Core request handlers
│   ├── providers/           # Provider registry & config
│   ├── translator/          # Format translation
│   └── services/            # Shared services
├── public/                  # Static assets (provider icons, favicon)
├── scripts/                 # Build & release scripts
├── skills/                  # Agent skills (SKILL.md format)
├── src/
│   ├── app/                 # Next.js App Router (API + Dashboard)
│   │   ├── api/             # API routes
│   │   └── (dashboard)/     # Dashboard pages
│   ├── lib/                 # Core libraries (DB, usage tracking)
│   ├── proxy.js             # Request proxy middleware
│   └── shared/              # Shared components & utilities
├── tests/                   # Vitest test suite
├── .dockerignore
├── .env.example
├── .gitignore
├── brand.json               # Single source of truth for branding
├── CHANGELOG.md
├── CLAUDE.md                # Development guidance for AI assistants
├── DOCKER.md                # Docker documentation
├── Dockerfile
├── LICENSE
├── next.config.mjs
├── package.json
└── README.md
```

## License

Released under the [MIT License](LICENSE).

**Copyright (c) 2026 FlagshipRouter contributors**
**Copyright (c) 2024-2026 decolua and contributors**

Third-party attributions preserved per original licenses. This project builds upon and integrates with numerous open-source AI provider SDKs and tools — see `package.json` dependencies and `open-sse/providers/registry/` for details.

## Known Limitations

- Usage DB currently stores under `~/.flagshiprouter` and does not follow `DATA_DIR`
- `/api/v1/route.js` returns a static model list and is not the main models source used by `/v1/models`
- Request logger writes full headers/body when enabled; treat log directory as sensitive
- Cloud behavior depends on correct `NEXT_PUBLIC_BASE_URL` and cloud endpoint reachability
- Test suite has documented known failures (see Testing section)
- Windows tray uses PowerShell NotifyIcon (no native binary); macOS/Linux uses `systray2` fork
- ARM64 macOS tray binary built separately and published to `tray-binaries` release

## Contributing

This project follows standard GitHub workflow:
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

Please run `npm run build` and tests before submitting.

---

*Built by [Yazan Al-Jabari](https://github.com/yazanus94-dot) — AI infrastructure engineer*