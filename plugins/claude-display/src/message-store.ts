import type { DisplayMessage } from "./types.js";

const MAX_MESSAGES = 200;

export class MessageStore {
  private messages: DisplayMessage[] = [];
  private channels: Set<string> = new Set(["general"]);

  add(msg: DisplayMessage): void {
    this.channels.add(msg.channel);
    this.messages.push(msg);
    if (this.messages.length > MAX_MESSAGES) {
      this.messages.shift();
    }
  }

  getAll(channel?: string): DisplayMessage[] {
    if (channel) {
      return this.messages.filter((m) => m.channel === channel);
    }
    return [...this.messages];
  }

  getChannels(): string[] {
    return [...this.channels];
  }

  addChannel(name: string): void {
    this.channels.add(name);
  }

  clear(channel?: string): void {
    if (channel) {
      this.messages = this.messages.filter((m) => m.channel !== channel);
    } else {
      this.messages = [];
    }
  }

  clearPanels(): void {
    this.messages = this.messages.filter(
      (m) =>
        m.kind !== "panel_create" &&
        m.kind !== "panel_update" &&
        m.kind !== "panel_remove"
    );
  }
}
