# claude-display Roadmap

## Vision

The terminal is Claude Code's bottleneck. claude-display is already an escape hatch for images, charts, and prompts — but it can become a **persistent visual canvas** where Claude and the user collaborate in real-time.

Unlike playground (which generates one-off HTML files for specific tasks), claude-display is **always on, always updating, and stateful across sessions**. The feedback loop goes both ways: Claude renders, you respond, Claude iterates — all without leaving the dashboard.

---

## Phase 1 — Foundation

### Persistent State with SQLite

Replace the in-memory 200-message circular buffer with `bun:sqlite`.

**Unlocks:** session history across restarts, bookmarks, full-text search, session timeline, usage analytics.

**Schema sketch:**
- `messages(id, kind, channel, session_id, content_json, timestamp)`
- `sessions(id, started_at, label)`
- `bookmarks(message_id, note)`

**Changes:** replace `message-store.ts` internals, add migration on startup, add `GET /api/search` and `POST /api/bookmark` endpoints to hub.

### Notification Center

Persistent notification sidebar (not just transient toasts).

- Notifications persist in a collapsible sidebar panel, grouped by session/time
- Dismissible individually or "clear all"
- Priority levels: info, success, warning, error — errors stick until dismissed
- Optional browser Notification API for background alerts

**New:** extend `show_notification` with `persistent: true` option. Add notification tray icon + slide-out panel in dashboard header.

---

## Phase 2 — Live Collaboration

### Live Preview Canvas

Claude renders HTML/CSS/JS live in the dashboard and iterates in real-time.

- Design a component → see it rendered live, give feedback
- Compare 3 color schemes side-by-side, pick one
- Generate a landing page → full preview in a sandboxed iframe, updates as Claude edits

**New MCP tools:**
- `display_preview` — renders HTML in a sandboxed iframe with live reload
- `display_comparison` — shows 2-4 options side-by-side with "pick one" interaction

### Approval Queue

Batch-review multiple decisions visually instead of sequential terminal prompts.

- All pending approvals appear as cards in the dashboard
- Each shows context (diff, proposal) with approve/reject/comment actions
- Handle them in any order; Claude continues as approvals arrive

**New MCP tool:** `queue_approval` with context, options, and callback.
**Dashboard:** dedicated "Approvals" channel with pending count badge.

### Rich Diff Viewer

Proper side-by-side diffs with syntax highlighting (like GitHub).

**New MCP tool:** `display_diff` with `before`, `after`, `filename`, `language`.
Pairs well with the approval queue — show diffs as part of approval cards.

---

## Phase 3 — Second Screen

### Overview Dashboard

A dedicated route (`/overview`) optimized for a secondary monitor.

- **Active task:** what Claude is currently working on
- **File activity:** live-updating list of files read/written this session
- **Token/cost counter:** rough session usage estimate
- **Session timeline:** scrollable feed of key events
- **Quick actions:** approve/reject pending prompts without switching to terminal

Same WebSocket connection, different layout.

### Markdown Document Editor

Bidirectional editing — Claude drafts, user edits in-browser, changes flow back.

- Claude displays a document in an editable markdown/code editor
- User edits directly in the dashboard
- Edits returned to Claude via the response mechanism

**New MCP tool:** `display_editor` with `content`, `language`, `response_id`.
Embed a lightweight editor (CodeMirror or Monaco) from CDN.

---

## Phase 4 — Visualization

### Diagram Rendering

Mermaid.js support for architecture diagrams, flowcharts, sequence diagrams, ERDs.

**New MCP tool:** `display_diagram` with `diagram_type` (mermaid/dot) and `source` (diagram DSL).
Add Mermaid.js from CDN, register renderer for `diagram` message kind.

Small addition, high value — Claude already thinks in diagrams but can only output ASCII art in terminal.

---

## Other Ideas

- **Kanban board view** for TaskList/TodoList items
- **Image gallery** mode for browsing generated/referenced images
- **Terminal mirror** — read-only view of Claude's terminal output on the dashboard
- **Export** — download any dashboard content as PNG, PDF, or standalone HTML
- **Theme customization** — user-selectable color schemes, dark/light toggle
- **Pinned messages** — pin important outputs to the top of a channel
- **Webhook integrations** — forward notifications to Slack, Discord, etc.

---

## Implementation Pattern

To add a new feature to claude-display:

1. **Define the message type** in `src/types.ts` (add to `DisplayMessage` union)
2. **Add the MCP tool** in `src/mcp-server.ts` (Zod schema + handler that calls `hub.broadcast()`)
3. **Register a renderer** in `src/dashboard/index.html` (add to the renderer registry or handle in the default render path)
4. **Add API endpoints** (if needed) in `src/hub.ts` for any REST interactions
5. **Update the message store** (if the feature needs special storage or querying)

The hub broadcasts all messages over WebSocket. The dashboard's renderer registry (`window.rendererRegistry`) dispatches by message `kind`. New tools follow the same pattern as existing ones — see `display_chart` or `create_panel` for reference.
