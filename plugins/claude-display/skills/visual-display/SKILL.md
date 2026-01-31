# Visual Display Skill

You have access to a visual dashboard that opens in the user's browser. Use it to show rich content that doesn't work well in the terminal.

## When to Use

- **Images**: Use `display_image` whenever you have an image URL or generate base64 image data
- **Charts/Tables**: Use `display_chart` for data visualization instead of ASCII tables
- **Rich HTML**: Use `display` with type "html" or "markdown" for formatted content
- **Code Review**: Use `display_code` to show syntax-highlighted code alongside terminal discussion
- **Status Panels**: Use `create_panel`/`update_panel` for persistent status displays (build status, test results, etc.)
- **User Input**: Use `prompt_user` when you need the user to make a choice via buttons or forms in the browser
- **Notifications**: Use `show_notification` for important alerts

## Channels

Organize content into channels (tabs) for different purposes:
- `general` - default channel for miscellaneous content
- `build` - build output and status
- `preview` - HTML/visual previews
- `debug` - debugging information

Create channels with `create_channel` or just send to them (they auto-create).

## Tool Reference

### Display Content
- `display(content, type, title?, channel?)` - Render HTML/markdown/text
- `display_image(data, format, caption?, channel?)` - Show images
- `display_code(code, language, title?, channel?)` - Syntax-highlighted code
- `display_chart(data, chart_type, title?, channel?)` - Charts and tables
- `show_notification(title, message, level)` - Toast notifications

### Panels (Persistent Sidebar)
- `create_panel(panel_id, title, content, position?)` - Create sidebar panel
- `update_panel(panel_id, content, title?)` - Update panel content
- `remove_panel(panel_id)` - Remove panel

### Interactive
- `prompt_user(prompt, inputs, timeout_seconds?)` - Show form, wait for response
- `display_interactive(html, callbacks, channel?)` - HTML with click callbacks

### Utility
- `open_dashboard()` - Open dashboard in browser
- `create_channel(name, icon?)` - Create a channel tab
- `clear(target, channel?)` - Clear content
- `register_renderer(kind, js_code)` - Register custom renderer

## Tips

- Always call `open_dashboard()` first if the user hasn't opened it yet
- Use panels for information that should persist (like build status)
- Use channels to organize different types of content
- Charts accept Chart.js data format for bar/line/pie/doughnut, or `{headers, rows}` for tables
