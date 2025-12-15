/**
 * MCP (Model Context Protocol) client for SSE transport
 * Used to connect to n8n's MCP Server Trigger node
 *
 * Note: Uses a local proxy to avoid CORS issues when connecting to external MCP servers
 */

export type McpTool = {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

export type McpToolResult = {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type McpClientOptions = {
  serverUrl: string;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
};

export class McpClient {
  private serverUrl: string;
  private eventSource: EventSource | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private messageEndpoint: string | null = null;
  private onConnectionChange?: (connected: boolean) => void;
  private onError?: (error: Error) => void;
  private connected = false;

  constructor(options: McpClientOptions) {
    this.serverUrl = options.serverUrl.replace(/\/$/, "");
    this.onConnectionChange = options.onConnectionChange;
    this.onError = options.onError;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use proxy to avoid CORS issues
        // The proxy routes SSE requests through the Vite dev server
        // n8n's MCP Server Trigger uses the base URL directly for SSE (no /sse suffix)
        const sseTarget = this.serverUrl;

        console.log("[MCP] Connecting to SSE:", sseTarget);
        const proxiedSseUrl = `/api/mcp-proxy/sse?target=${encodeURIComponent(sseTarget)}`;
        console.log("[MCP] Proxied URL:", proxiedSseUrl);

        this.eventSource = new EventSource(proxiedSseUrl);

        this.eventSource.onopen = () => {
          console.log("[MCP] SSE connection opened");
          this.connected = true;
          this.onConnectionChange?.(true);
        };

        this.eventSource.addEventListener("endpoint", (event) => {
          // n8n sends the message endpoint URL via this event
          console.log("[MCP] Received endpoint event:", event.data);
          if (event.data) {
            // n8n returns a relative URL, so we need to make it absolute
            let endpoint = event.data;
            if (endpoint.startsWith('/')) {
              // Extract the origin from the server URL
              const url = new URL(this.serverUrl);
              endpoint = `${url.origin}${endpoint}`;
            }
            console.log("[MCP] Message endpoint:", endpoint);
            this.messageEndpoint = endpoint;
          }
        });

        this.eventSource.addEventListener("message", (event) => {
          try {
            console.log("[MCP] Received message:", event.data);
            const response: JsonRpcResponse = JSON.parse(event.data);
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
              this.pendingRequests.delete(response.id);
              if (response.error) {
                pending.reject(new Error(response.error.message));
              } else {
                pending.resolve(response.result);
              }
            }
          } catch (err) {
            console.error("[MCP] Failed to parse message:", err);
          }
        });

        this.eventSource.onerror = (event) => {
          console.error("[MCP] SSE error:", event);
          this.connected = false;
          this.onConnectionChange?.(false);
          const err = new Error("SSE connection error");
          this.onError?.(err);
          if (!this.messageEndpoint) {
            reject(err);
          }
        };

        // Wait for the endpoint event, then initialize
        const timeout = setTimeout(() => {
          if (!this.messageEndpoint) {
            reject(new Error("Timeout waiting for endpoint event"));
          }
        }, 10000);

        const checkEndpoint = setInterval(async () => {
          if (this.messageEndpoint) {
            clearInterval(checkEndpoint);
            clearTimeout(timeout);
            try {
              await this.initialize();
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        }, 100);
      } catch (err) {
        reject(err);
      }
    });
  }

  private async initialize(): Promise<void> {
    console.log("[MCP] Initializing...");
    const result = await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "codex-dashboard",
        version: "1.0.0",
      },
    });
    console.log("[MCP] Initialize result:", result);

    // Send initialized notification
    await this.sendNotification("notifications/initialized", {});
    console.log("[MCP] Initialization complete");
  }

  private async sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.messageEndpoint) {
      throw new Error("Not connected - no message endpoint");
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    console.log("[MCP] Sending request:", request);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Use proxy for POST requests to avoid CORS
      const proxiedMessageUrl = `/api/mcp-proxy/message?target=${encodeURIComponent(this.messageEndpoint!)}`;

      fetch(proxiedMessageUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      })
        .then((res) => {
          console.log("[MCP] POST response status:", res.status);
          if (!res.ok) {
            return res.text().then((text) => {
              throw new Error(`HTTP ${res.status}: ${text}`);
            });
          }
        })
        .catch((err) => {
          console.error("[MCP] POST error:", err);
          this.pendingRequests.delete(id);
          reject(err);
        });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 30000);
    });
  }

  private async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    if (!this.messageEndpoint) {
      throw new Error("Not connected - no message endpoint");
    }

    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    console.log("[MCP] Sending notification:", notification);

    // Use proxy for POST requests to avoid CORS
    const proxiedMessageUrl = `/api/mcp-proxy/message?target=${encodeURIComponent(this.messageEndpoint)}`;

    const res = await fetch(proxiedMessageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notification),
    });

    console.log("[MCP] Notification response status:", res.status);
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.sendRequest("tools/list", {}) as { tools: McpTool[] };
    console.log("[MCP] Tools list:", result);
    return result.tools || [];
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
    const result = await this.sendRequest("tools/call", {
      name,
      arguments: args,
    }) as McpToolResult;
    return result;
  }

  disconnect(): void {
    console.log("[MCP] Disconnecting...");
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connected = false;
    this.messageEndpoint = null;
    this.pendingRequests.clear();
    this.onConnectionChange?.(false);
  }

  isConnected(): boolean {
    return this.connected && this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Singleton for managing multiple MCP connections
class McpConnectionManager {
  private connections = new Map<string, McpClient>();

  async getOrCreateConnection(serverUrl: string, options?: Omit<McpClientOptions, "serverUrl">): Promise<McpClient> {
    const existing = this.connections.get(serverUrl);
    if (existing?.isConnected()) {
      return existing;
    }

    const client = new McpClient({ serverUrl, ...options });
    await client.connect();
    this.connections.set(serverUrl, client);
    return client;
  }

  getConnection(serverUrl: string): McpClient | undefined {
    return this.connections.get(serverUrl);
  }

  disconnectAll(): void {
    for (const client of this.connections.values()) {
      client.disconnect();
    }
    this.connections.clear();
  }
}

export const mcpManager = new McpConnectionManager();
