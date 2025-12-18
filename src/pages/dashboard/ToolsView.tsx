import { useState, useEffect, useCallback } from "react";
import { N8nToolConfig, type N8nToolConfiguration } from "./N8nToolConfig";
import { NotificationToolConfig, type NotificationToolConfiguration } from "./NotificationToolConfig";
import { Button, Field, Modal } from "../../components";
import { McpClient, mcpManager, type McpTool, type McpToolResult } from "../../lib/mcp";
import { updateTool, deleteTool, type Tool } from "../../lib/db";

export type ToolsViewProps = {
  selectedProjectId: string;
  selectedSubItemId?: string;
  toolCount: number;
  tools?: Tool[];
  onCreateTool?: (type: string) => void;
  onSaveN8nTool?: (config: N8nToolConfiguration) => void;
  onSaveNotificationTool?: (config: NotificationToolConfiguration) => void;
  onToolDeleted?: () => void;
};

type ToolTypeCard = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

type LogEntry = {
  id: string;
  timestamp: Date;
  type: "info" | "request" | "response" | "error";
  message: string;
  details?: string;
};

function HttpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 12h20M12 2c2.5 2.5 4 6 4 10s-1.5 7.5-4 10c-2.5-2.5-4-6-4-10s1.5-7.5 4-10Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m8 6-6 6 6 6M16 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WebhookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 9v4l-4.5 2.5M12 13l4.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FunctionIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 22c1.66 0 3-1.5 3-3.33V5.33C12 3.5 10.66 2 9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 8v8M14 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m22 2-7 20-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m22 2-11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function N8nIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const toolTypes: ToolTypeCard[] = [
  {
    id: "n8n",
    title: "n8n MCP Server",
    description: "Connect to n8n's MCP server to trigger workflows and automations",
    icon: <N8nIcon />,
  },
  {
    id: "http",
    title: "HTTP Request",
    description: "Make API calls to external services and REST endpoints",
    icon: <HttpIcon />,
  },
  {
    id: "database",
    title: "Database Query",
    description: "Query SQL or NoSQL databases to retrieve or update data",
    icon: <DatabaseIcon />,
  },
  {
    id: "code",
    title: "Code Execution",
    description: "Run custom JavaScript or Python code snippets",
    icon: <CodeIcon />,
  },
  {
    id: "webhook",
    title: "Webhook",
    description: "Trigger external webhooks and handle incoming events",
    icon: <WebhookIcon />,
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Create events, check availability, and manage schedules",
    icon: <CalendarIcon />,
  },
  {
    id: "search",
    title: "Knowledge Search",
    description: "Search through documents and knowledge bases",
    icon: <SearchIcon />,
  },
  {
    id: "function",
    title: "Custom Function",
    description: "Define a custom tool with your own parameters and logic",
    icon: <FunctionIcon />,
  },
  {
    id: "notification",
    title: "Send Notification",
    description: "Send emails, SMS, or push notifications to users",
    icon: <SendIcon />,
  },
];

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

function StatusDot({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    disconnected: "rgba(10, 10, 10, 0.3)",
    connecting: "rgba(234, 179, 8, 0.8)",
    connected: "rgba(34, 197, 94, 0.8)",
    error: "rgba(239, 68, 68, 0.8)",
  };

  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: colors[status],
      }}
    />
  );
}

// Tool Detail View Component
function ToolDetailView({ tool, onDelete }: { tool: Tool; onDelete?: () => void }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [client, setClient] = useState<McpClient | null>(null);
  const [liveTools, setLiveTools] = useState<McpTool[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedToolName, setSelectedToolName] = useState<string | null>(null);
  const [toolArgs, setToolArgs] = useState<string>("{}");
  const [executing, setExecuting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const addLog = useCallback((type: LogEntry["type"], message: string, details?: string) => {
    setLogs((prev) => [
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        type,
        message,
        details,
      },
      ...prev,
    ].slice(0, 100)); // Keep last 100 logs
  }, []);

  // Check for existing connection on mount
  useEffect(() => {
    if (!tool.serverUrl) return;

    const existingClient = mcpManager.getConnection(tool.serverUrl);
    if (existingClient?.isConnected()) {
      setClient(existingClient);
      setStatus("connected");
      addLog("info", "Restored existing connection");

      // Fetch current tools
      existingClient.listTools().then((tools) => {
        setLiveTools(tools);
        addLog("info", `Found ${tools.length} available tools`);
      }).catch((err) => {
        addLog("error", "Failed to list tools", err instanceof Error ? err.message : String(err));
      });
    }
  }, [tool.serverUrl, addLog]);

  const connect = useCallback(async () => {
    if (!tool.serverUrl) return;

    setStatus("connecting");
    addLog("info", "Connecting to MCP server...", tool.serverUrl);

    try {
      // Use the connection manager to get or create a connection
      const newClient = await mcpManager.getOrCreateConnection(tool.serverUrl, {
        onConnectionChange: (connected) => {
          if (!connected) {
            setStatus("disconnected");
            setClient(null);
            addLog("info", "Disconnected from MCP server");
          }
        },
        onError: (err) => {
          addLog("error", "Connection error", err.message);
          setStatus("error");
        },
      });

      setClient(newClient);
      setStatus("connected");
      addLog("info", "Connected to MCP server");

      const tools = await newClient.listTools();
      setLiveTools(tools);
      addLog("info", `Found ${tools.length} available tools`);

      // Check if tools differ from stored
      const storedNames = new Set((tool.availableTools ?? []).map((t) => t.name));
      const liveNames = new Set(tools.map((t) => t.name));
      const isDifferent = storedNames.size !== liveNames.size ||
        tools.some((t) => !storedNames.has(t.name));
      setHasChanges(isDifferent);
    } catch (err) {
      setStatus("error");
      addLog("error", "Failed to connect", err instanceof Error ? err.message : String(err));
    }
  }, [tool.serverUrl, tool.availableTools, addLog]);

  const disconnect = useCallback(() => {
    // Actually disconnect and remove from manager
    client?.disconnect();
    setClient(null);
    setStatus("disconnected");
    setLiveTools([]);
    setHasChanges(false);
    addLog("info", "Disconnected from MCP server");
  }, [client, addLog]);

  const refreshTools = useCallback(async () => {
    if (!client || status !== "connected") return;

    setRefreshing(true);
    addLog("info", "Refreshing tools from MCP server...");

    try {
      const tools = await client.listTools();
      setLiveTools(tools);
      addLog("info", `Refreshed: ${tools.length} tools available`);

      // Check if tools differ from stored
      const storedNames = new Set((tool.availableTools ?? []).map((t) => t.name));
      const liveNames = new Set(tools.map((t) => t.name));
      const isDifferent = storedNames.size !== liveNames.size ||
        tools.some((t) => !storedNames.has(t.name));
      setHasChanges(isDifferent);
    } catch (err) {
      addLog("error", "Failed to refresh tools", err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }, [client, status, tool.availableTools, addLog]);

  const saveTools = useCallback(async () => {
    if (liveTools.length === 0) return;

    setSaving(true);
    addLog("info", "Saving tools to database...");

    try {
      await updateTool(tool.id, {
        availableTools: liveTools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
      setHasChanges(false);
      addLog("info", "Tools saved successfully");
    } catch (err) {
      addLog("error", "Failed to save tools", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [tool.id, liveTools, addLog]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      // Disconnect first if connected
      client?.disconnect();
      await deleteTool(tool.id);
      onDelete?.();
    } catch (err) {
      addLog("error", "Failed to delete tool", err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }, [tool.id, client, onDelete, addLog]);

  const executeTool = useCallback(async () => {
    if (!client || !selectedToolName) return;

    setExecuting(true);
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(toolArgs);
    } catch {
      addLog("error", "Invalid JSON arguments", toolArgs);
      setExecuting(false);
      return;
    }

    addLog("request", `Calling tool: ${selectedToolName}`, JSON.stringify(args, null, 2));

    try {
      const result: McpToolResult = await client.callTool(selectedToolName, args);
      const responseText = result.content
        .map((c) => (c.type === "text" ? c.text : `[${c.type}]`))
        .join("\n");
      addLog("response", `Tool response`, responseText);
    } catch (err) {
      addLog("error", "Tool execution failed", err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  }, [client, selectedToolName, toolArgs, addLog]);

  // Auto-connect on mount if we have a serverUrl
  useEffect(() => {
    if (tool.serverUrl && status === "disconnected") {
      connect();
    }
    return () => {
      client?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.id]);

  // Use stored tools if not connected
  const displayTools = liveTools.length > 0 ? liveTools : (tool.availableTools || []);

  return (
    <div className="ui-page">
      <div className="ui-tool-detail">
        <div className="ui-tool-detail__main">
          <div className="ui-panel">
            <div className="ui-panel__top">
              <div className="ui-panel__title-block">
                <div className="ui-panel__kicker">n8n MCP Server</div>
                <div className="ui-panel__title-row">
                  <div className="ui-panel__title">{tool.name}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="ui-tool-status">
                  <StatusDot status={status} />
                  <span className="ui-tool-status__text">
                    {status === "disconnected" && "Disconnected"}
                    {status === "connecting" && "Connecting..."}
                    {status === "connected" && "Connected"}
                    {status === "error" && "Error"}
                  </span>
                </div>
                {status === "connected" ? (
                  <Button type="button" variant="secondary" onClick={disconnect}>
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={connect}
                    disabled={status === "connecting"}
                  >
                    {status === "connecting" ? "Connecting..." : "Connect"}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={saveTools}
                  disabled={saving || !hasChanges}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDeleteConfirmOpen(true)}
                  style={{ color: "#ef4444" }}
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="ui-panel__body">
              <Field label="Server URL">
                <input
                  className="ui-input"
                  value={tool.serverUrl || ""}
                  readOnly
                  style={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                />
              </Field>

              <div className="ui-tool-section">
                <div className="ui-tool-section__header">
                  <span className="ui-tool-section__title">Available Tools ({displayTools.length})</span>
                  {status === "connected" && (
                    <button
                      type="button"
                      className="ui-tool-section__refresh"
                      onClick={refreshTools}
                      disabled={refreshing}
                      title="Refresh tools from server"
                    >
                      <RefreshIcon />
                      <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                    </button>
                  )}
                </div>
                <div className="ui-tool-list">
                  {displayTools.length === 0 ? (
                    <div className="ui-tool-list__empty">
                      {status === "connected"
                        ? "No tools available from this server"
                        : "Connect to see available tools"}
                    </div>
                  ) : (
                    displayTools.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        className={`ui-tool-item ${selectedToolName === t.name ? "is-selected" : ""}`}
                        onClick={() => setSelectedToolName(t.name)}
                      >
                        <div className="ui-tool-item__icon">
                          <ToolIcon />
                        </div>
                        <div className="ui-tool-item__content">
                          <div className="ui-tool-item__name">{t.name}</div>
                          {t.description && (
                            <div className="ui-tool-item__description">{t.description}</div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {selectedToolName && status === "connected" && (
                <div className="ui-tool-section">
                  <div className="ui-tool-section__header">
                    <span className="ui-tool-section__title">Test Tool: {selectedToolName}</span>
                  </div>
                  <Field label="Arguments (JSON)">
                    <textarea
                      className="ui-textarea"
                      rows={4}
                      value={toolArgs}
                      onChange={(e) => setToolArgs(e.target.value)}
                      placeholder='{"key": "value"}'
                    />
                  </Field>
                  <Button
                    type="button"
                    onClick={executeTool}
                    disabled={executing}
                    style={{ marginTop: 12 }}
                  >
                    {executing ? "Executing..." : "Execute Tool"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="ui-tool-detail__logs">
          <div className="ui-logs-panel">
            <div className="ui-logs-panel__header">
              <span>Logs</span>
              {logs.length > 0 && (
                <button
                  type="button"
                  className="ui-logs-panel__clear"
                  onClick={() => setLogs([])}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="ui-logs-panel__list">
              {logs.length === 0 ? (
                <div className="ui-logs-panel__empty">No logs yet</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={`ui-log-entry ui-log-entry--${log.type}`}>
                    <div className="ui-log-entry__header">
                      <span className="ui-log-entry__type">{log.type.toUpperCase()}</span>
                      <span className="ui-log-entry__time">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="ui-log-entry__message">{log.message}</div>
                    {log.details && (
                      <pre className="ui-log-entry__details">{log.details}</pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={deleteConfirmOpen}
        title="Delete MCP Server"
        description={`Are you sure you want to delete "${tool.name}"? This action cannot be undone.`}
        onClose={() => {
          if (deleting) return;
          setDeleteConfirmOpen(false);
        }}
        footer={
          <div className="ui-modal__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ backgroundColor: "#ef4444", borderColor: "#ef4444" }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      >
        <div className="ui-modal__field">
          <div className="ui-modal__field-label">
            This will permanently remove this MCP server and all its tool configurations.
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Notification Tool Detail View Component
function NotificationToolDetailView({ tool, onDelete }: { tool: Tool; onDelete?: () => void }) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteTool(tool.id);
      onDelete?.();
    } catch (err) {
      console.error("Failed to delete tool:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }, [tool.id, onDelete]);

  const channel = tool.notificationChannel ?? "sms";

  return (
    <div className="ui-page">
      <div className="ui-panel">
        <div className="ui-panel__top">
          <div className="ui-panel__title-block">
            <div className="ui-panel__kicker">Send Notification</div>
            <div className="ui-panel__title-row">
              <div className="ui-panel__title">{tool.name}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(true)}
              style={{ color: "#ef4444" }}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="ui-panel__body">
          <div className="ui-notification-detail">
            <div className="ui-notification-detail__section">
              <div className="ui-notification-detail__label">Notification Channel</div>
              <div className="ui-notification-detail__channels">
                {channel === "sms" ? (
                  <div className="ui-notification-detail__channel">
                    <div className="ui-notification-detail__channel-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M9 21h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="12" cy="17" r="1" fill="currentColor" />
                      </svg>
                    </div>
                    <div className="ui-notification-detail__channel-info">
                      <div className="ui-notification-detail__channel-name">SMS (Twilio)</div>
                      <div className="ui-notification-detail__channel-desc">Send text messages via Twilio</div>
                    </div>
                  </div>
                ) : (
                  <div className="ui-notification-detail__channel">
                    <div className="ui-notification-detail__channel-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="ui-notification-detail__channel-info">
                      <div className="ui-notification-detail__channel-name">Email (SendGrid)</div>
                      <div className="ui-notification-detail__channel-desc">Send emails via SendGrid</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="ui-notification-detail__section">
              <div className="ui-notification-detail__label">Available Tools for Agents</div>
              <div className="ui-notification-detail__tools">
                {channel === "sms" ? (
                  <div className="ui-notification-detail__tool">
                    <div className="ui-notification-detail__tool-name">send_sms</div>
                    <div className="ui-notification-detail__tool-desc">
                      Send an SMS message to a phone number
                    </div>
                    <div className="ui-notification-detail__tool-params">
                      <code>to</code> (string, required) - Phone number in E.164 format<br />
                      <code>message</code> (string, required) - The message content
                    </div>
                  </div>
                ) : (
                  <div className="ui-notification-detail__tool">
                    <div className="ui-notification-detail__tool-name">send_email</div>
                    <div className="ui-notification-detail__tool-desc">
                      Send an email to a recipient
                    </div>
                    <div className="ui-notification-detail__tool-params">
                      <code>to</code> (string, required) - Recipient email address<br />
                      <code>subject</code> (string, required) - Email subject line<br />
                      <code>body</code> (string, required) - Email body content
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="ui-notification-detail__section">
              <div className="ui-notification-detail__label">Configuration</div>
              <div className="ui-notification-detail__info-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 7v6M12 16v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>
                  {channel === "sms"
                    ? <>API keys for <strong>Twilio</strong> must be configured in the <strong>API Keys</strong> section for this tool to work.</>
                    : <>API key for <strong>SendGrid</strong> must be configured in the <strong>API Keys</strong> section for this tool to work.</>
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={deleteConfirmOpen}
        title="Delete Notification Tool"
        description={`Are you sure you want to delete "${tool.name}"? This action cannot be undone.`}
        onClose={() => {
          if (deleting) return;
          setDeleteConfirmOpen(false);
        }}
        footer={
          <div className="ui-modal__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ backgroundColor: "#ef4444", borderColor: "#ef4444" }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      >
        <div className="ui-modal__field">
          <div className="ui-modal__field-label">
            This will permanently remove this notification tool.
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function ToolsView({ selectedSubItemId, tools = [], onCreateTool, onSaveN8nTool, onSaveNotificationTool, onToolDeleted }: ToolsViewProps) {
  const [creatingToolType, setCreatingToolType] = useState<string | null>(null);

  // If creating an n8n tool, show the config UI
  if (creatingToolType === "n8n") {
    return (
      <N8nToolConfig
        onCancel={() => setCreatingToolType(null)}
        onSave={(config) => {
          onSaveN8nTool?.(config);
          setCreatingToolType(null);
        }}
      />
    );
  }

  // If creating a notification tool, show the config UI
  if (creatingToolType === "notification") {
    return (
      <NotificationToolConfig
        onCancel={() => setCreatingToolType(null)}
        onSave={(config) => {
          onSaveNotificationTool?.(config);
          setCreatingToolType(null);
        }}
      />
    );
  }

  // If a tool is selected, show tool detail view
  const selectedTool = tools.find((t) => t.id === selectedSubItemId);
  if (selectedTool) {
    if (selectedTool.type === "notification") {
      return <NotificationToolDetailView tool={selectedTool} onDelete={onToolDeleted} />;
    }
    return <ToolDetailView tool={selectedTool} onDelete={onToolDeleted} />;
  }

  // No tool selected - show tool type cards
  return (
    <div className="ui-page">
      <div className="ui-tools-header">
        <h1 className="ui-tools-header__title">Create a new tool</h1>
        <p className="ui-tools-header__description">
          Choose a tool type to get started. Tools let your agents take actions like calling APIs, querying databases, or running custom code.
        </p>
      </div>
      <div className="ui-tool-cards">
        {toolTypes.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="ui-tool-card"
            onClick={() => {
              if (tool.id === "n8n" || tool.id === "notification") {
                setCreatingToolType(tool.id);
              } else {
                onCreateTool?.(tool.id);
              }
            }}
          >
            <div className="ui-tool-card__icon">{tool.icon}</div>
            <div className="ui-tool-card__content">
              <div className="ui-tool-card__title">{tool.title}</div>
              <div className="ui-tool-card__description">{tool.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
