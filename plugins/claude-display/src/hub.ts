import { readFileSync } from "fs";
import { join } from "path";
import { MessageStore } from "./message-store.js";
import type {
  DisplayMessage,
  ResponseMessage,
  PendingResponse,
} from "./types.js";

const RESPONSE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class Hub {
  private store = new MessageStore();
  private wsClients = new Set<unknown>();
  private pendingResponses = new Map<string, PendingResponse>();
  private port: number;
  private server: ReturnType<typeof Bun.serve> | null = null;
  private relayMode = false;

  constructor(port: number) {
    this.port = port;
  }

  isRelay(): boolean {
    return this.relayMode;
  }

  getPort(): number {
    return this.port;
  }

  async start(): Promise<boolean> {
    const dashboardPath = join(import.meta.dir, "..", "dashboard", "index.html");
    let dashboardHtml: string;
    try {
      dashboardHtml = readFileSync(dashboardPath, "utf-8");
    } catch {
      dashboardHtml = "<html><body><h1>Dashboard not found</h1></body></html>";
    }

    try {
      this.server = Bun.serve({
        port: this.port,
        fetch: (req, server) => {
          const url = new URL(req.url);

          // WebSocket upgrade
          if (url.pathname === "/ws") {
            const upgraded = server.upgrade(req);
            if (upgraded) return undefined as unknown as Response;
            return new Response("WebSocket upgrade failed", { status: 400 });
          }

          // CORS headers
          const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          };

          if (req.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
          }

          // Routes
          if (url.pathname === "/" || url.pathname === "/index.html") {
            return new Response(dashboardHtml, {
              headers: { "Content-Type": "text/html", ...corsHeaders },
            });
          }

          if (url.pathname === "/api/message" && req.method === "POST") {
            return this.handlePostMessage(req, corsHeaders);
          }

          if (url.pathname === "/api/history" && req.method === "GET") {
            const channel = url.searchParams.get("channel") || undefined;
            const messages = this.store.getAll(channel);
            const channels = this.store.getChannels();
            return Response.json(
              { messages, channels },
              { headers: corsHeaders }
            );
          }

          if (url.pathname === "/api/response" && req.method === "POST") {
            return this.handlePostResponse(req, corsHeaders);
          }

          if (url.pathname === "/api/health") {
            return Response.json(
              { status: "ok", clients: this.wsClients.size },
              { headers: corsHeaders }
            );
          }

          return new Response("Not Found", {
            status: 404,
            headers: corsHeaders,
          });
        },
        websocket: {
          open: (ws) => {
            this.wsClients.add(ws);
          },
          close: (ws) => {
            this.wsClients.delete(ws);
          },
          message: (ws, message) => {
            this.handleWsMessage(message);
          },
        },
      });

      return true;
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (
        error.code === "EADDRINUSE" ||
        error.message?.includes("address already in use") ||
        error.message?.includes("Failed to start")
      ) {
        this.relayMode = true;
        return true;
      }
      throw err;
    }
  }

  private async handlePostMessage(
    req: Request,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    try {
      const msg = (await req.json()) as DisplayMessage;
      this.pushMessage(msg);
      return Response.json({ ok: true }, { headers: corsHeaders });
    } catch {
      return Response.json(
        { error: "Invalid JSON" },
        { status: 400, headers: corsHeaders }
      );
    }
  }

  private async handlePostResponse(
    req: Request,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    try {
      const resp = (await req.json()) as ResponseMessage;
      this.resolveResponse(resp);
      return Response.json({ ok: true }, { headers: corsHeaders });
    } catch {
      return Response.json(
        { error: "Invalid JSON" },
        { status: 400, headers: corsHeaders }
      );
    }
  }

  private handleWsMessage(message: string | Buffer): void {
    try {
      const data = JSON.parse(
        typeof message === "string" ? message : message.toString()
      );
      if (data.responseId) {
        this.resolveResponse(data as ResponseMessage);
      }
    } catch {
      // ignore malformed messages
    }
  }

  pushMessage(msg: DisplayMessage): void {
    this.store.add(msg);
    this.broadcast(msg);
  }

  private broadcast(msg: DisplayMessage): void {
    const payload = JSON.stringify(msg);
    for (const ws of this.wsClients) {
      try {
        (ws as { send: (data: string) => void }).send(payload);
      } catch {
        this.wsClients.delete(ws);
      }
    }
  }

  async sendViaRelay(msg: DisplayMessage): Promise<void> {
    try {
      await fetch(`http://127.0.0.1:${this.port}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
    } catch {
      // Hub may not be running yet
    }
  }

  async sendMessage(msg: DisplayMessage): Promise<void> {
    if (this.relayMode) {
      await this.sendViaRelay(msg);
    } else {
      this.pushMessage(msg);
    }
  }

  waitForResponse(responseId: string, timeoutMs = RESPONSE_TIMEOUT_MS): Promise<ResponseMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingResponses.delete(responseId);
        reject(new Error(`Response timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingResponses.set(responseId, {
        responseId,
        resolve,
        reject,
        timeoutId,
      });
    });
  }

  private resolveResponse(resp: ResponseMessage): void {
    const pending = this.pendingResponses.get(resp.responseId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingResponses.delete(resp.responseId);
      pending.resolve(resp);
    }
  }

  clearChannel(channel?: string): void {
    this.store.clear(channel);
    const clearMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      kind: "clear",
      channel: channel || "__all__",
      sessionId: "system",
      timestamp: Date.now(),
      content: channel || "__all__",
    };
    this.broadcast(clearMsg);
  }

  clearPanels(): void {
    this.store.clearPanels();
    const clearMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      kind: "clear",
      channel: "__panels__",
      sessionId: "system",
      timestamp: Date.now(),
      content: "__panels__",
    };
    this.broadcast(clearMsg);
  }

  stop(): void {
    if (this.server) {
      this.server.stop();
    }
    for (const pending of this.pendingResponses.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error("Hub shutting down"));
    }
    this.pendingResponses.clear();
  }
}
