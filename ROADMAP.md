# claude-display Roadmap

## Vision

claude-display is an **agent runtime's visual surface** — not a UI toolkit.

The dashboard should be like a browser: it doesn't know what you'll build, it just gives you DOM, events, and network. Agents get a blank canvas, not pre-built widgets. The best features will be ones we didn't anticipate — emergent behaviors arising from powerful, composable primitives.

**Design principles:**
- **Composable primitives > opinionated tools.** Ship building blocks, not finished products.
- **Remove constraints > add features.** Every enum, hardcoded layout, and fixed type is a wall. Tear them down.
- **Emergent behaviors > prescribed features.** An approval queue is one agent's idea. Response routing + card rendering + queue semantics are primitives that let any agent build any workflow.
- **Unix pipes, not enterprise frameworks.** Small tools that compose freely.

---

## Layer 0 — Remove the Walls

The current codebase has rigid boundaries that limit what agents can do. This layer is about removing them.

### Open Up Enums

Accept arbitrary strings where we currently lock to predefined values:
- `chart_type` — locked to `bar | line | pie | doughnut | table`. Let agents pass any Chart.js type or custom renderer name.
- Content `type` — locked to `html | markdown | text`. Let agents pass any string; unknown types fall back to text.
- `notification level` — locked to `info | success | warning | error`. Accept any string; dashboard styles unknown levels neutrally.
- `panel position` — locked to `sidebar | bottom`. Accept any string; agents can define custom positions via layout API.

**Pattern:** Zod schemas switch from `.enum()` to `.string()` with documented conventions. Existing values still work. New values get sensible fallbacks.

### `display_raw` Tool

A single generic tool that replaces the need for kind-specific tools:

```
display_raw({ kind: string, data: any, channel?: string })
```

- Dispatches to a registered renderer if one exists for `kind`
- Falls back to formatted JSON display
- Agents define their own message types without touching server code

This makes `register_renderer` the **primary extensibility mechanism**, not an afterthought. Any agent can invent a new visualization by registering a renderer and sending `display_raw` messages.

### What This Enables

Agents can create visualization types that don't exist yet — dependency graphs, timeline views, kanban boards, design mockups — without any changes to the MCP server. The server becomes a dumb pipe; intelligence lives in the agent and the renderer.

---

## Layer 1 — State & Memory

Agents currently write to the dashboard but can't read back. It's a one-way mirror. This layer adds memory and introspection.

### SQLite Persistence

Replace the in-memory 200-message circular buffer with `bun:sqlite`.

**Schema sketch:**
- `messages(id, kind, channel, session_id, data_json, timestamp)`
- `sessions(id, started_at, label)`
- `kv_store(key, value_json, updated_at)`

**Changes:** Replace `message-store.ts` internals, add migration on startup.

### State Introspection API

New MCP tools that let agents read what's on screen:

- **`get_messages`**`(channel?, kind?, limit?, offset?)` — query message history with filtering
- **`get_panels`**`()` — list all active panels with their IDs, titles, positions, and content
- **`get_channels`**`()` — list all channels with message counts
- **`get_sessions`**`(limit?)` — list recent sessions

Agents can check if a panel exists before updating it, reference past outputs, and build on previous decisions.

### Key-Value Store

- **`set_state`**`(key, value)` — persist arbitrary JSON, backed by SQLite
- **`get_state`**`(key)` — retrieve it
- **`delete_state`**`(key)` — remove it
- **`list_state`**`(prefix?)` — enumerate keys

Like `localStorage` but agent-accessible and persistent across sessions. Other agents can read values too, enabling inter-agent communication and shared context.

### What This Enables

- Agents referencing past outputs ("show me what I displayed yesterday")
- Cross-session continuity (preferences, decisions, accumulated context)
- Inter-agent communication via shared state
- Agents that build incrementally instead of starting fresh every session

---

## Layer 2 — Bidirectional Communication

The dashboard currently has limited input: buttons, text fields, and selects. Agents can only block-wait for responses. This layer makes communication rich and flexible.

### Fix Relay Mode Response Routing

Currently, `prompt_user` responses are process-local — they break in relay mode because the response goes to the wrong hub instance. Fix this by routing responses through the primary hub via WebSocket or shared state.

**Critical for multi-agent setups** where multiple Claude instances share one dashboard.

### Custom Input Renderers

Parallel to `register_renderer` for display, agents can register custom input types:

```
register_input_renderer({ type: string, js_code: string })
```

The JavaScript receives a container element and must call `window.submitInput(id, value)` when the user completes input. Dashboard renders these inside `prompt_user` flows alongside built-in types.

**Removes the button/text/select constraint entirely.** Agents define their own form controls.

### Async Response Retrieval

New tools for non-blocking interaction:

- **`get_response`**`(prompt_id, timeout?)` — poll for a response instead of blocking
- **`list_pending_prompts`**`()` — see what's waiting for user input
- **`cancel_prompt`**`(prompt_id)` — withdraw a pending prompt

Agents can fire-and-forget prompts and check back later, or manage multiple concurrent prompts.

### Event Subscriptions

Agents can subscribe to dashboard events:

- **`subscribe_events`**`(events: string[])` — e.g., `["click", "panel_resize", "channel_switch"]`
- Events delivered via a new `get_events` polling tool or streamed through existing WebSocket

### What This Enables

- Rich forms: color pickers, sliders, drawing canvases, code editors — all agent-defined
- Non-blocking workflows: agents don't freeze waiting for input
- Multi-agent coordination: one agent prompts, another checks the response
- Reactive dashboards: agents respond to user interactions in real-time

---

## Layer 3 — Layout Freedom

The dashboard has a fixed structure: header, tabs, feed, sidebar. Agents can't restructure the page. This layer gives agents control over layout.

### Dynamic Layout API

New tools for defining layout regions:

- **`set_layout`**`(regions: {id, position, size}[])` — define a custom grid/flex layout
- **`assign_region`**`(region_id, content_type)` — assign a channel, panel, or custom content to a region

Agents compose their own page structures instead of being locked into feed + sidebar.

### Full-Page Canvas Mode

```
display_fullpage({ html: string, callbacks?: {id, label}[] })
```

Replaces the entire dashboard content area with agent-provided HTML. The agent gets full layout control while maintaining hub communication via callbacks and `display_interactive` patterns.

### Multiple Dashboard Routes

- `/` — default feed view (backwards compatible)
- `/canvas` — full-page canvas mode
- `/monitor` — overview/monitoring layout
- `/custom/:name` — agent-defined routes with independent layouts

Each route maintains its own WebSocket connection and layout state.

### What This Enables

- Overview dashboards for second monitors
- Design tools with custom spatial layouts
- Monitoring screens with real-time metrics grids
- Full applications built inside the dashboard — the agent decides the shape

---

## Layer 4 — Rich Primitives (Optional Batteries)

These are conveniences, not constraints. Shipped as **opt-in renderer packs** that agents can load, not baked into core.

### Renderer Packs

- **Diagrams** — Mermaid.js renderer for flowcharts, sequence diagrams, ERDs
- **Diffs** — Side-by-side diff viewer with syntax highlighting
- **Live Preview** — Sandboxed iframe with live reload for HTML/CSS/JS
- **Code Editor** — Embedded Monaco/CodeMirror as an input renderer
- **Media** — Audio/video playback renderer

Loaded via `register_renderer` from CDN or bundled. Agents can always override with custom renderers — these are defaults, not mandates.

### Agent Conveniences

- Agent-defined keyboard shortcuts
- Clipboard integration (read/write)
- File drop zones (user drops files, agent receives content)
- Export tools (PNG, PDF, standalone HTML of any content)

---

## Other Ideas

- Kanban board view for task tracking
- Image gallery mode for browsing generated/referenced images
- Terminal mirror — read-only view of Claude's terminal output
- Theme customization — user-selectable color schemes
- Pinned messages — pin important outputs to top of channel
- Webhook integrations — forward events to Slack, Discord, etc.
- Session labeling and search

---

## 5 MVP Features

These are the highest-leverage primitives to build first. Each one removes a major wall and enables a class of emergent behaviors.

### 1. `display_raw` Tool

**What:** A single generic tool: `{kind: string, data: any}`. Dispatches to registered renderer or falls back to formatted JSON.

**Why:** Removes the need for kind-specific tools entirely. Agents define their own message types. Combined with `register_renderer`, this turns the dashboard into an open platform.

**Enables:** Any visualization type — dependency graphs, timeline views, custom cards, domain-specific displays — without server changes.

### 2. State Introspection API

**What:** New MCP tools: `get_messages(channel?, limit?)`, `get_panels()`, `get_channels()`, `get_state(key)`. Agents can read what's on screen and query history.

**Why:** Closes the "write-only" gap. Agents currently fire messages into the void with no way to check what landed.

**Enables:** Conditional updates ("only create this panel if it doesn't exist"), referencing past outputs, building iteratively on displayed content.

### 3. Key-Value Store

**What:** `set_state(key, value)` and `get_state(key)` tools backed by SQLite. Agents persist arbitrary data across sessions.

**Why:** Agents currently start with amnesia every session. State persistence enables accumulated intelligence.

**Enables:** Cross-session memory, inter-agent communication, user preferences, decision history — agents that learn and remember.

### 4. Custom Input Renderers

**What:** `register_input_renderer(type, jsCode)` paralleling `register_renderer`. Agents define their own form controls.

**Why:** The button/text/select constraint is the biggest limit on bidirectional communication. Agents need rich input.

**Enables:** Color pickers, sliders, drawing canvases, code editors, drag-and-drop interfaces, approval workflows with inline diffs — all agent-defined.

### 5. Full-Page Canvas Mode

**What:** New tool: `display_fullpage(html, callbacks?)`. Replaces the entire dashboard content area with agent-provided HTML.

**Why:** The fixed header/tabs/feed/sidebar layout assumes a chat-style interface. Some agent use cases need completely different layouts.

**Enables:** Monitoring dashboards, design tools, interactive applications, presentation mode — agents build arbitrary UIs inside the dashboard.

---

## Implementation Pattern

To add a new feature to claude-display:

1. **Define the message type** in `src/types.ts` (add to `DisplayMessage` union)
2. **Add the MCP tool** in `src/mcp-server.ts` (Zod schema + handler that calls `hub.broadcast()`)
3. **Register a renderer** in `src/dashboard/index.html` (add to the renderer registry)
4. **Add API endpoints** (if needed) in `src/hub.ts` for REST interactions
5. **Update the store** (if the feature needs persistence or querying)

**Key question for every new feature:** Can this be a renderer instead of a hardcoded tool? If your feature can be implemented as a `register_renderer` + `display_raw` combination, prefer that. It keeps the core small and gives agents the choice of whether to use it.

**Anti-pattern:** If your feature adds a new enum value, hardcoded layout region, or fixed behavior — reconsider. Can it be a primitive that agents compose freely instead?

The hub broadcasts all messages over WebSocket. The dashboard's renderer registry (`window.rendererRegistry`) dispatches by message `kind`. New tools follow the same pattern as existing ones — see `display_chart` or `create_panel` for reference.
