# Claude Display: Visual Companion for Claude Code

## Overview

A Claude Code plugin that provides a persistent browser-based dashboard ("second screen") where Claude Code can push rich visual content -- images, HTML, markdown, notifications, code, charts, and persistent panels. Multiple Claude Code sessions can push to the same dashboard simultaneously.

## Architecture

```
Claude Code Session A                Browser Dashboard
         |                              (external monitor)
    [MCP stdio]                              |
         |                            [WebSocket client]
         v                                   |
  claude-display process ---- HTTP/WS ----->-+
    (MCP server + Hub)                       |
         ^                                   |
    [HTTP POST relay]                        |
         |                                   |
Claude Code Session B                        |
    (relay mode)  ---- HTTP POST ----------->+
```

### How It Works

1. **Claude Code spawns `claude-display` as an MCP server** via stdio transport. This gives Claude access to display tools (`display`, `display_image`, `show_notification`, etc.).

2. **The same process starts an HTTP + WebSocket hub** on port 7890 (configurable). It serves the dashboard HTML and maintains WebSocket connections to browsers.

3. **The user opens `http://127.0.0.1:7890`** in a browser on their external monitor. The dashboard connects via WebSocket and receives all display messages in real time.

4. **Multi-session support**: The first Claude Code session owns the port. Subsequent sessions detect `EADDRINUSE` and switch to relay mode -- they POST messages to the existing hub via HTTP, which broadcasts to all connected browsers.

## Technology Choices

### Runtime: Bun
- Runs TypeScript directly (no build step)
- Native HTTP server and WebSocket server (no `ws` package needed)
- Fast startup, low memory footprint

### Dependencies (minimal)
| Package | Purpose | Why this one |
|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | MCP server implementation | Official Anthropic SDK, only option |
| `zod` | Schema validation | Required by MCP SDK, industry standard |

### Dashboard Libraries (CDN-loaded)
| Library | Purpose | Stars | Why this one |
|---------|---------|-------|--------------|
| `marked` | Markdown to HTML | 50k+ | Most popular, battle-tested, fast |
| `highlight.js` | Syntax highlighting | 23k+ | Industry standard, 190+ languages |
| `Chart.js` | Charts (bar, line, pie) | 65k+ | Most popular, simple API, no deps |
| `DOMPurify` | HTML sanitization | 14k+ | Standard for safe innerHTML, OWASP recommended |

## MCP Tools

### Core Display
| Tool | Params | Description |
|------|--------|-------------|
| `display` | `content, type (html/markdown/text), title?, channel?` | Render rich content in the feed |
| `display_image` | `data, format (url/base64), caption?, channel?` | Show an image |
| `display_code` | `code, language, title?, channel?` | Syntax-highlighted code block |
| `show_notification` | `title, message, level (info/warning/error/success)` | Toast notification |
| `display_chart` | `data, chart_type (bar/line/pie/table), title?, channel?` | Chart or data table |

### Panels (persistent sidebar)
| Tool | Params | Description |
|------|--------|-------------|
| `create_panel` | `id, title, content?, type?` | Create/replace a persistent panel |
| `update_panel` | `id, content, type?` | Update panel content |
| `remove_panel` | `id` | Remove a panel |

### Channels
| Tool | Params | Description |
|------|--------|-------------|
| `create_channel` | `name, icon?` | Create a named tab |
| `clear` | `target? (main/panels/all)` | Clear display areas |

### Interactive (Bidirectional)
| Tool | Params | Description |
|------|--------|-------------|
| `prompt_user` | `prompt, inputs[]` | Show form in dashboard, block until user responds |
| `display_interactive` | `html, callbacks[]` | Non-blocking HTML with callback buttons |

### Utility
| Tool | Params | Description |
|------|--------|-------------|
| `open_dashboard` | (none) | Open dashboard in default browser |
| `register_renderer` | `kind, js_code` | Register custom JS renderer for a message kind |

## Dashboard Layout

```
+--header (connection status, session count, clear)--------+
| [Tab: General] [Tab: Build] [Tab: Preview] [Tab: Debug]  |
+-----------------------------------------------------------+
|                                    |                      |
|  Channel Feed (scrollable)         | Panels Sidebar       |
|  - markdown cards                  | - persistent named   |
|  - images with captions            |   panels             |
|  - code blocks                     | - interactive forms  |
|  - charts/tables                   |   (prompt_user)      |
|  - interactive widgets             |                      |
|  - session badge per item          |                      |
|                                    |                      |
+------------------------------------+----------------------+
     [Toast notifications overlay, top-right]
```

- Dark theme (bg: `#1a1a2e`, cards: `#16213e`, text: `#e0e0e0`)
- Session badges color-coded by session ID
- Channels as tabs with unread count badges
- Auto-scroll to newest content, pause on scroll-up

## Extensibility

### 1. Channels/Tabs
Every display tool accepts an optional `channel` parameter (defaults to "general"). Channels auto-create on first message. Each channel has its own scrollable feed. Tab badges show unread counts.

### 2. Bidirectional Communication
`prompt_user` is a blocking MCP tool -- it sends a form definition to the dashboard, and the tool handler awaits a Promise that resolves when the user submits. The hub assigns a `responseId`; the browser sends the response back via WebSocket. Configurable timeout (default 5 min).

`display_interactive` is non-blocking -- renders HTML with `data-callback-id` attributes. Clicks send callbacks to the hub for later retrieval.

### 3. Custom Renderers
`register_renderer` sends JavaScript to the dashboard. The dashboard evaluates it in a scoped context and registers it as a handler for a new message `kind`. Built-in renderers (markdown, image, code, chart) use the same registry. This lets Claude teach the dashboard new visualizations on the fly.

## File Structure

```
claude-display/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── .mcp.json                    # MCP server config (stdio, uses bun)
├── package.json                 # Bun package
├── tsconfig.json                # TypeScript config (for IDE support)
├── DESIGN.md                    # This file
├── src/
│   ├── index.ts                 # Entry: bootstrap MCP server + hub
│   ├── mcp-server.ts            # MCP tool definitions
│   ├── hub.ts                   # Bun HTTP + WebSocket server + relay
│   ├── message-store.ts         # Ring buffer for message history
│   └── types.ts                 # Shared TypeScript types
├── dashboard/
│   └── index.html               # Self-contained SPA (inline CSS, CDN JS)
├── skills/
│   └── visual-display/
│       └── SKILL.md             # Tells Claude when to use display tools
└── commands/
    └── display.md               # /display slash command
```

## Hooks Integration

A `Notification` hook automatically forwards Claude Code's built-in notifications to the dashboard as toasts, even when Claude doesn't explicitly call display tools. This makes the dashboard a passive monitor as well as an active display surface.

## Multi-Session Behavior

1. First session binds port 7890, runs the hub
2. Second session gets `EADDRINUSE`, switches to relay mode
3. Relay mode: POST messages to `http://127.0.0.1:7890/api/message`
4. Dashboard shows all sessions with color-coded badges
5. When the first session exits, the port is freed; next session takes over as hub

## Security Considerations

- Dashboard binds to `127.0.0.1` only (no external access)
- Raw HTML rendered via DOMPurify sanitization
- `register_renderer` JS evaluated in scoped context (not global eval)
- No authentication needed (localhost only)
- Base64 images capped at 10MB
