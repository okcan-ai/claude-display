# claude-display

Visual companion dashboard for Claude Code. Push images, HTML, markdown, charts, and interactive panels to a persistent browser display.

## What it does

claude-display gives Claude Code a visual output channel -- a browser-based dashboard that stays open alongside your terminal. Claude can push rich content to it in real-time:

- **HTML / Markdown / Text** -- rendered content with full formatting
- **Images** -- URLs or base64-encoded (PNG, JPG, GIF, SVG)
- **Syntax-highlighted code** -- any language
- **Charts** -- bar, line, pie, doughnut (via Chart.js) and tables
- **Persistent panels** -- sidebar widgets for build status, test results, etc.
- **Notifications** -- toast alerts at different severity levels
- **Interactive prompts** -- buttons, text inputs, select menus with responses sent back to Claude
- **Custom renderers** -- extend the dashboard with your own JavaScript renderers

Multiple Claude Code sessions share the same dashboard (relay mode).

## Requirements

- [Bun](https://bun.sh) runtime installed (`curl -fsSL https://bun.sh/install | bash`)

## Installation

```bash
# Add the marketplace (one-time)
claude plugin marketplace add okcan-ai/claude-display

# Install the plugin
claude plugin install claude-display
```

## Manual / Local Installation

Clone this repo and symlink or copy the plugin directory:

```bash
git clone https://github.com/okcan-ai/claude-display.git
cp -r claude-display/plugins/claude-display ~/.claude/plugins/local/claude-display
```

Then restart Claude Code.

## Usage

Once installed, Claude Code gains these MCP tools:

### Display Content
| Tool | Description |
|------|-------------|
| `display` | Render HTML, markdown, or plain text |
| `display_image` | Show an image (URL or base64) |
| `display_code` | Syntax-highlighted code block |
| `display_chart` | Bar, line, pie, doughnut charts or tables |
| `show_notification` | Toast notification (info/success/warning/error) |

### Panels (Persistent Sidebar)
| Tool | Description |
|------|-------------|
| `create_panel` | Create a persistent sidebar panel |
| `update_panel` | Update panel content |
| `remove_panel` | Remove a panel |

### Interactive
| Tool | Description |
|------|-------------|
| `prompt_user` | Show a form/buttons and wait for user response |
| `display_interactive` | HTML with click callbacks |

### Utility
| Tool | Description |
|------|-------------|
| `open_dashboard` | Open the dashboard in the default browser |
| `create_channel` | Create a named tab |
| `clear` | Clear a channel, panels, or everything |
| `register_renderer` | Register a custom JS renderer for a message kind |

## Channels

Content is organized into channels (tabs). Use channels like `general`, `build`, `preview`, `debug`, or create your own. Channels auto-create when you send content to them.

## Configuration

Set the dashboard port via environment variable:

```
DISPLAY_PORT=7890  # default
```

## How it works

The plugin runs a Bun-based MCP server that:
1. Exposes MCP tools over stdio to Claude Code
2. Starts an HTTP + WebSocket server serving the dashboard
3. When multiple Claude sessions connect, subsequent ones run in relay mode -- forwarding messages to the existing hub

## License

MIT
