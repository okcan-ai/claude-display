# claude-display

## Development Commands

- `bun run src/index.ts` (or `bun run start`) — start the MCP server
- `DISPLAY_PORT=8000 bun run src/index.ts` — custom port (default: 7890)
- No build step needed — Bun transpiles TypeScript on the fly
- No test suite or linter configured
- Dependencies installed automatically via `bun --install=fallback`

## Architecture

MCP plugin providing a browser-based visual dashboard for Claude Code.

### Message Flow

Claude Code → stdio → MCP Server → Hub → WebSocket → Browser Dashboard
Interactive: Browser → POST /api/response → Hub resolves Promise → MCP tool returns to Claude

### Source Files (all under `plugins/claude-display/`)

- **src/index.ts** — Entry point: creates Hub + MCP server, handles shutdown
- **src/mcp-server.ts** — Defines 14 MCP tools (display, charts, panels, channels, interactive prompts, etc.) with Zod validation
- **src/hub.ts** — Bun HTTP + WebSocket server. Serves dashboard, broadcasts messages to connected browsers. Supports relay mode (forwards to existing hub if port is taken)
- **src/message-store.ts** — In-memory circular buffer (max 200 messages), tracks channels
- **src/dashboard/index.html** — Self-contained ~26KB SPA with inline CSS/JS. Uses marked.js, highlight.js, Chart.js, DOMPurify. Extensible renderer registry
- **src/types.ts** — DisplayMessage union type (18+ message kinds), PromptInput, ResponseMessage interfaces

## Key Patterns

- **Relay mode**: if port already bound, hub acts as relay client forwarding via HTTP POST
- **Response queue**: pending interactive prompts with 5-minute timeout
- **Session IDs**: random 8-char IDs, dashboard color-codes by session
