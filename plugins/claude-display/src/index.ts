#!/usr/bin/env bun
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hub } from "./hub.js";
import { createMcpServer } from "./mcp-server.js";

const port = parseInt(process.env.DISPLAY_PORT || "7890", 10);
const sessionId = crypto.randomUUID().slice(0, 8);

const hub = new Hub(port);
await hub.start();

if (hub.isRelay()) {
  process.stderr.write(
    `[claude-display] Relay mode: forwarding to hub on port ${port}\n`
  );
} else {
  process.stderr.write(
    `[claude-display] Hub started on http://127.0.0.1:${port}\n`
  );
}

const mcpServer = createMcpServer(hub, sessionId);
const transport = new StdioServerTransport();
await mcpServer.connect(transport);

process.stderr.write(
  `[claude-display] MCP server connected (session: ${sessionId})\n`
);

process.on("SIGINT", () => {
  hub.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  hub.stop();
  process.exit(0);
});
