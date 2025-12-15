import { useState, useCallback } from "react";
import { Button, Field } from "../../components";
import { McpClient, type McpTool } from "../../lib/mcp";

export type N8nToolConfigProps = {
  onSave?: (config: N8nToolConfiguration) => void;
  onCancel?: () => void;
  initialConfig?: N8nToolConfiguration;
};

export type N8nToolConfiguration = {
  name: string;
  serverUrl: string;
  availableTools: McpTool[];
};

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
        marginRight: 8,
      }}
    />
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

export function N8nToolConfig({ onSave, onCancel, initialConfig }: N8nToolConfigProps) {
  const [name, setName] = useState(initialConfig?.name ?? "");
  const [serverUrl, setServerUrl] = useState(initialConfig?.serverUrl ?? "");
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<McpTool[]>(initialConfig?.availableTools ?? []);
  const [client, setClient] = useState<McpClient | null>(null);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  const testConnection = useCallback(async () => {
    if (!serverUrl.trim()) {
      setError("Please enter a server URL");
      return;
    }

    setStatus("connecting");
    setError(null);
    setTools([]);

    // Disconnect existing client
    client?.disconnect();

    const newClient = new McpClient({
      serverUrl: serverUrl.trim(),
      onConnectionChange: (connected) => {
        if (!connected && status === "connected") {
          setStatus("disconnected");
        }
      },
      onError: (err) => {
        setError(err.message);
        setStatus("error");
      },
    });

    try {
      await newClient.connect();
      setClient(newClient);
      setStatus("connected");

      // List available tools
      const availableTools = await newClient.listTools();
      setTools(availableTools);

      // Select all tools by default
      setSelectedTools(new Set(availableTools.map((t) => t.name)));
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to connect");
      newClient.disconnect();
    }
  }, [serverUrl, client, status]);

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please enter a name for this tool");
      return;
    }
    if (status !== "connected" || tools.length === 0) {
      setError("Please test the connection first");
      return;
    }

    const selectedToolsList = tools.filter((t) => selectedTools.has(t.name));

    onSave?.({
      name: name.trim(),
      serverUrl: serverUrl.trim(),
      availableTools: selectedToolsList,
    });
  };

  const toggleTool = (toolName: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  };

  return (
    <div className="ui-page">
      <div className="ui-panel">
        <div className="ui-panel__top">
          <div className="ui-panel__title-block">
            <div className="ui-panel__kicker">New Tool</div>
            <div className="ui-panel__title-row">
              <div className="ui-panel__title">n8n MCP Server</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={status !== "connected" || tools.length === 0 || !name.trim()}
            >
              Save Tool
            </Button>
          </div>
        </div>

        <div className="ui-panel__body">
          <div className="ui-form">
            <Field label="Tool Name" hint="A friendly name for this n8n MCP server connection">
              <input
                className="ui-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Customer Support Tools"
              />
            </Field>

            <Field label="n8n MCP Server URL" hint="The URL of your n8n MCP Server Trigger node">
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  className="ui-input"
                  value={serverUrl}
                  onChange={(e) => {
                    setServerUrl(e.target.value);
                    setStatus("disconnected");
                    setTools([]);
                  }}
                  placeholder="https://your-n8n.com/webhook/mcp"
                  style={{ flex: 1 }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={testConnection}
                  disabled={status === "connecting"}
                >
                  {status === "connecting" ? "Connecting..." : "Test Connection"}
                </Button>
              </div>
            </Field>

            <div className="ui-n8n-status">
              <StatusDot status={status} />
              <span className="ui-n8n-status__text">
                {status === "disconnected" && "Not connected"}
                {status === "connecting" && "Connecting to n8n..."}
                {status === "connected" && `Connected - ${tools.length} tool${tools.length !== 1 ? "s" : ""} available`}
                {status === "error" && "Connection failed"}
              </span>
            </div>

            {error && <div className="ui-inline-error">{error}</div>}

            {tools.length > 0 && (
              <div className="ui-n8n-tools">
                <div className="ui-n8n-tools__header">
                  <span className="ui-n8n-tools__title">Available Tools</span>
                  <span className="ui-n8n-tools__count">
                    {selectedTools.size} of {tools.length} selected
                  </span>
                </div>
                <div className="ui-n8n-tools__list">
                  {tools.map((tool) => (
                    <button
                      key={tool.name}
                      type="button"
                      className={`ui-n8n-tool ${selectedTools.has(tool.name) ? "is-selected" : ""}`}
                      onClick={() => toggleTool(tool.name)}
                    >
                      <div className="ui-n8n-tool__checkbox">
                        {selectedTools.has(tool.name) && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M20 6L9 17l-5-5"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="ui-n8n-tool__icon">
                        <ToolIcon />
                      </div>
                      <div className="ui-n8n-tool__content">
                        <div className="ui-n8n-tool__name">{tool.name}</div>
                        {tool.description && (
                          <div className="ui-n8n-tool__description">{tool.description}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
