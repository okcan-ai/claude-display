export interface DisplayMessage {
  id: string;
  kind:
    | "html"
    | "markdown"
    | "text"
    | "image"
    | "code"
    | "notification"
    | "chart"
    | "panel_create"
    | "panel_update"
    | "panel_remove"
    | "channel_create"
    | "clear"
    | "prompt"
    | "interactive"
    | "register_renderer"
    | string; // extensible for custom renderers
  title?: string;
  content?: string;
  channel: string;
  sessionId: string;
  timestamp: number;

  // Image-specific
  data?: string;
  format?: "url" | "base64" | "png" | "jpg" | "gif" | "svg";
  caption?: string;

  // Code-specific
  code?: string;
  language?: string;

  // Notification-specific
  level?: "info" | "success" | "warning" | "error";
  message?: string;

  // Chart-specific
  chartType?: "bar" | "line" | "pie" | "doughnut" | "table";
  chartData?: unknown;

  // Panel-specific
  panelId?: string;
  panelTitle?: string;
  panelContent?: string;
  panelPosition?: "sidebar" | "bottom";

  // Channel-specific
  channelName?: string;
  channelIcon?: string;

  // Interactive/prompt-specific
  responseId?: string;
  inputs?: PromptInput[];
  prompt?: string;
  html?: string;
  callbacks?: CallbackDef[];

  // Custom renderer
  rendererKind?: string;
  jsCode?: string;
}

export interface PromptInput {
  type: "button" | "text" | "select";
  label: string;
  id: string;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
}

export interface CallbackDef {
  id: string;
  label?: string;
}

export interface ResponseMessage {
  responseId: string;
  value: unknown;
  timestamp: number;
}

export interface PendingResponse {
  responseId: string;
  resolve: (value: ResponseMessage) => void;
  reject: (reason: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}
