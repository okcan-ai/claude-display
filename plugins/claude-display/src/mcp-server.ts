import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Hub } from "./hub.js";
import type { DisplayMessage } from "./types.js";

export function createMcpServer(hub: Hub, sessionId: string): McpServer {
  const server = new McpServer({
    name: "claude-display",
    version: "1.0.0",
  });

  function makeId(): string {
    return crypto.randomUUID();
  }

  function now(): number {
    return Date.now();
  }

  // ── Core Display Tools ──

  server.tool(
    "display",
    "Render HTML, markdown, or plain text on the visual dashboard",
    {
      content: z.string().describe("The content to display"),
      type: z
        .enum(["html", "markdown", "text"])
        .default("markdown")
        .describe("Content type"),
      title: z.string().optional().describe("Optional title"),
      channel: z
        .string()
        .default("general")
        .describe("Channel/tab to display in"),
    },
    async ({ content, type, title, channel }) => {
      const msg: DisplayMessage = {
        id: makeId(),
        kind: type,
        content,
        title,
        channel,
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: `Displayed ${type} content${title ? `: ${title}` : ""} in channel "${channel}"` }] };
    }
  );

  server.tool(
    "display_image",
    "Show an image on the dashboard (URL or base64)",
    {
      data: z.string().describe("Image URL or base64-encoded data"),
      format: z
        .enum(["url", "base64", "png", "jpg", "gif", "svg"])
        .default("url")
        .describe("Image format"),
      caption: z.string().optional().describe("Image caption"),
      channel: z.string().default("general").describe("Channel/tab"),
    },
    async ({ data, format, caption, channel }) => {
      const msg: DisplayMessage = {
        id: makeId(),
        kind: "image",
        data,
        format,
        caption,
        channel,
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: `Displayed image${caption ? `: ${caption}` : ""} in channel "${channel}"` }] };
    }
  );

  server.tool(
    "display_code",
    "Display syntax-highlighted code on the dashboard",
    {
      code: z.string().describe("Code to display"),
      language: z.string().default("text").describe("Programming language"),
      title: z.string().optional().describe("Code block title"),
      channel: z.string().default("general").describe("Channel/tab"),
    },
    async ({ code, language, title, channel }) => {
      const msg: DisplayMessage = {
        id: makeId(),
        kind: "code",
        code,
        language,
        title,
        channel,
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: `Displayed ${language} code${title ? `: ${title}` : ""} in channel "${channel}"` }] };
    }
  );

  server.tool(
    "show_notification",
    "Show a toast notification on the dashboard",
    {
      title: z.string().describe("Notification title"),
      message: z.string().describe("Notification message"),
      level: z
        .enum(["info", "success", "warning", "error"])
        .default("info")
        .describe("Notification level"),
    },
    async ({ title, message, level }) => {
      const msg: DisplayMessage = {
        id: makeId(),
        kind: "notification",
        title,
        message,
        level,
        channel: "general",
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: `Notification shown: [${level}] ${title}` }] };
    }
  );

  server.tool(
    "display_chart",
    "Display a chart or table on the dashboard",
    {
      data: z
        .string()
        .describe(
          "Chart data as JSON string. For Chart.js charts: {labels: string[], datasets: [{label, data, backgroundColor?}]}. For tables: {headers: string[], rows: any[][]}"
        ),
      chart_type: z
        .enum(["bar", "line", "pie", "doughnut", "table"])
        .describe("Chart type"),
      title: z.string().optional().describe("Chart title"),
      channel: z.string().default("general").describe("Channel/tab"),
    },
    async ({ data, chart_type, title, channel }) => {
      let chartData: unknown;
      try {
        chartData = JSON.parse(data);
      } catch {
        return { content: [{ type: "text", text: "Error: Invalid JSON data for chart" }], isError: true };
      }
      const msg: DisplayMessage = {
        id: makeId(),
        kind: "chart",
        chartType: chart_type,
        chartData,
        title,
        channel,
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: `Displayed ${chart_type} chart${title ? `: ${title}` : ""} in channel "${channel}"` }] };
    }
  );

  // ── Panel Tools ──

  server.tool(
    "create_panel",
    "Create or replace a persistent sidebar panel",
    {
      panel_id: z.string().describe("Unique panel identifier"),
      title: z.string().describe("Panel title"),
      content: z
        .string()
        .describe("Panel content (HTML or markdown)"),
      position: z
        .enum(["sidebar", "bottom"])
        .default("sidebar")
        .describe("Panel position"),
    },
    async ({ panel_id, title, content, position }) => {
      const msg: DisplayMessage = {
        id: makeId(),
        kind: "panel_create",
        panelId: panel_id,
        panelTitle: title,
        panelContent: content,
        panelPosition: position,
        channel: "general",
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: `Panel "${title}" created (id: ${panel_id})` }] };
    }
  );

  server.tool(
    "update_panel",
    "Update an existing panel's content",
    {
      panel_id: z.string().describe("Panel identifier to update"),
      content: z.string().describe("New panel content"),
      title: z.string().optional().describe("New panel title"),
    },
    async ({ panel_id, content, title }) => {
      const msg: DisplayMessage = {
        id: makeId(),
        kind: "panel_update",
        panelId: panel_id,
        panelContent: content,
        panelTitle: title,
        channel: "general",
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: `Panel "${panel_id}" updated` }] };
    }
  );

  server.tool(
    "remove_panel",
    "Remove a panel from the dashboard",
    {
      panel_id: z.string().describe("Panel identifier to remove"),
    },
    async ({ panel_id }) => {
      const msg: DisplayMessage = {
        id: makeId(),
        kind: "panel_remove",
        panelId: panel_id,
        channel: "general",
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: `Panel "${panel_id}" removed` }] };
    }
  );

  // ── Channel Tools ──

  server.tool(
    "create_channel",
    "Create a named channel/tab on the dashboard",
    {
      name: z.string().describe("Channel name"),
      icon: z.string().optional().describe("Optional icon/emoji for the tab"),
    },
    async ({ name, icon }) => {
      const msg: DisplayMessage = {
        id: makeId(),
        kind: "channel_create",
        channelName: name,
        channelIcon: icon,
        channel: name,
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: `Channel "${name}" created` }] };
    }
  );

  server.tool(
    "clear",
    "Clear a channel, panels, or everything",
    {
      target: z
        .enum(["channel", "panels", "all"])
        .describe("What to clear"),
      channel: z
        .string()
        .optional()
        .describe("Channel name (when target is 'channel')"),
    },
    async ({ target, channel }) => {
      if (target === "panels") {
        hub.clearPanels();
      } else if (target === "channel") {
        hub.clearChannel(channel);
      } else {
        hub.clearChannel(); // clear all
        hub.clearPanels();
      }
      return { content: [{ type: "text", text: `Cleared ${target}${channel ? `: ${channel}` : ""}` }] };
    }
  );

  // ── Interactive Tools ──

  server.tool(
    "prompt_user",
    "Show a form/buttons in the dashboard and wait for user response. This is a BLOCKING call that waits for the user to interact.",
    {
      prompt: z.string().describe("Prompt text to show the user"),
      inputs: z
        .string()
        .describe(
          'JSON array of input definitions: [{type: "button"|"text"|"select", label: string, id: string, options?: string[], placeholder?: string}]'
        ),
      timeout_seconds: z
        .number()
        .default(300)
        .describe("Timeout in seconds (default 300 = 5 min)"),
    },
    async ({ prompt, inputs, timeout_seconds }) => {
      let parsedInputs;
      try {
        parsedInputs = JSON.parse(inputs);
      } catch {
        return { content: [{ type: "text", text: "Error: Invalid JSON for inputs" }], isError: true };
      }

      const responseId = makeId();
      const msg: DisplayMessage = {
        id: makeId(),
        kind: "prompt",
        prompt,
        inputs: parsedInputs,
        responseId,
        channel: "general",
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);

      try {
        const response = await hub.waitForResponse(
          responseId,
          timeout_seconds * 1000
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.value),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Prompt timed out or failed: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "display_interactive",
    "Render HTML with callback buttons/forms. Non-blocking - responses can be retrieved later.",
    {
      html: z
        .string()
        .describe(
          'HTML with data-callback-id attributes on interactive elements'
        ),
      callbacks: z
        .string()
        .describe(
          'JSON array of callback definitions: [{id: string, label?: string}]'
        ),
      channel: z.string().default("general").describe("Channel/tab"),
    },
    async ({ html, callbacks, channel }) => {
      let parsedCallbacks;
      try {
        parsedCallbacks = JSON.parse(callbacks);
      } catch {
        return { content: [{ type: "text", text: "Error: Invalid JSON for callbacks" }], isError: true };
      }

      const msg: DisplayMessage = {
        id: makeId(),
        kind: "interactive",
        html,
        callbacks: parsedCallbacks,
        channel,
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: "Interactive content displayed" }] };
    }
  );

  // ── Utility Tools ──

  server.tool(
    "open_dashboard",
    "Open the dashboard URL in the default browser",
    {},
    async () => {
      const url = `http://127.0.0.1:${hub.getPort()}`;
      const proc = Bun.spawn(["open", url]);
      await proc.exited;
      return { content: [{ type: "text", text: `Opened dashboard at ${url}` }] };
    }
  );

  server.tool(
    "register_renderer",
    "Register a custom JavaScript renderer for a message kind in the dashboard",
    {
      kind: z.string().describe("The message kind this renderer handles"),
      js_code: z
        .string()
        .describe(
          "JavaScript code. Function signature: (msg, container) => void"
        ),
    },
    async ({ kind, js_code }) => {
      const msg: DisplayMessage = {
        id: makeId(),
        kind: "register_renderer",
        rendererKind: kind,
        jsCode: js_code,
        channel: "general",
        sessionId,
        timestamp: now(),
      };
      await hub.sendMessage(msg);
      return { content: [{ type: "text", text: `Renderer registered for kind "${kind}"` }] };
    }
  );

  return server;
}
