import { useState, useRef, useEffect } from "react";
import { Button } from "../../components";
import type { Agent, AgentToolRef, Tool } from "../../lib/db";
import { updateAgent } from "../../lib/db";

export type AgentToolsTabProps = {
  agent: Agent;
  tools: Tool[];
  onError?: (error: string) => void;
};

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

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type DropdownItem = {
  toolId: string;
  toolName: string;
  parentName: string;
  description?: string;
};

export function AgentToolsTab({ agent, tools, onError }: AgentToolsTabProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const agentTools = agent.tools ?? [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  // Build dropdown items grouped by tool (MCP server)
  const groupedTools = tools.map((tool) => ({
    tool,
    items: (tool.availableTools ?? []).map((at) => ({
      toolId: tool.id,
      toolName: at.name,
      parentName: tool.name,
      description: at.description,
    })),
  }));

  // Filter out already-added tools
  const isToolAdded = (toolId: string, toolName: string) =>
    agentTools.some((t) => t.toolId === toolId && t.toolName === toolName);

  const availableCount = groupedTools.reduce(
    (acc, g) => acc + g.items.filter((i) => !isToolAdded(i.toolId, i.toolName)).length,
    0,
  );

  const addTool = async (item: DropdownItem) => {
    const newTools: AgentToolRef[] = [...agentTools, { toolId: item.toolId, toolName: item.toolName }];
    try {
      await updateAgent(agent.id, { tools: newTools });
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to add tool");
    }
    setDropdownOpen(false);
  };

  const removeTool = async (toolId: string, toolName: string) => {
    const newTools = agentTools.filter((t) => !(t.toolId === toolId && t.toolName === toolName));
    try {
      await updateAgent(agent.id, { tools: newTools });
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to remove tool");
    }
  };

  // Get tool info for display
  const getToolInfo = (ref: AgentToolRef) => {
    const parentTool = tools.find((t) => t.id === ref.toolId);
    const childTool = parentTool?.availableTools?.find((at) => at.name === ref.toolName);
    return {
      parentName: parentTool?.name ?? "Unknown",
      toolName: ref.toolName,
      description: childTool?.description,
    };
  };

  return (
    <div className="ui-agent-tools">
      <div className="ui-agent-tools__header">
        <div className="ui-agent-tools__header-text">
          <span className="ui-agent-tools__title">Agent Tools</span>
          <span className="ui-agent-tools__count">{agentTools.length} tool{agentTools.length !== 1 ? "s" : ""} assigned</span>
        </div>
        <div className="ui-agent-tools__dropdown" ref={dropdownRef}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={availableCount === 0}
          >
            <PlusIcon />
            <span>Add tool</span>
            <ChevronDownIcon />
          </Button>

          {dropdownOpen && (
            <div className="ui-agent-tools__dropdown-panel">
              {groupedTools.map((group) => {
                const availableItems = group.items.filter((i) => !isToolAdded(i.toolId, i.toolName));
                if (availableItems.length === 0) return null;

                return (
                  <div key={group.tool.id} className="ui-agent-tools__dropdown-group">
                    <div className="ui-agent-tools__dropdown-header">
                      {group.tool.name}
                      <span className="ui-agent-tools__dropdown-badge">{group.tool.type}</span>
                    </div>
                    {availableItems.map((item) => (
                      <button
                        key={`${item.toolId}-${item.toolName}`}
                        type="button"
                        className="ui-agent-tools__dropdown-item"
                        onClick={() => addTool(item)}
                      >
                        <div className="ui-agent-tools__dropdown-item-icon">
                          <ToolIcon />
                        </div>
                        <div className="ui-agent-tools__dropdown-item-content">
                          <div className="ui-agent-tools__dropdown-item-name">{item.toolName}</div>
                          {item.description && (
                            <div className="ui-agent-tools__dropdown-item-desc">{item.description}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
              {availableCount === 0 && (
                <div className="ui-agent-tools__dropdown-empty">No more tools available</div>
              )}
            </div>
          )}
        </div>
      </div>

      {agentTools.length === 0 ? (
        <div className="ui-agent-tools__empty">
          <div className="ui-agent-tools__empty-icon">
            <ToolIcon />
          </div>
          <div className="ui-agent-tools__empty-title">No tools assigned</div>
          <div className="ui-agent-tools__empty-desc">
            Add tools to give this agent capabilities like searching, creating events, or calling APIs.
          </div>
        </div>
      ) : (
        <div className="ui-agent-tools__list">
          {agentTools.map((ref) => {
            const info = getToolInfo(ref);
            return (
              <div key={`${ref.toolId}-${ref.toolName}`} className="ui-agent-tools__item">
                <div className="ui-agent-tools__item-icon">
                  <ToolIcon />
                </div>
                <div className="ui-agent-tools__item-content">
                  <div className="ui-agent-tools__item-name">{info.toolName}</div>
                  <div className="ui-agent-tools__item-parent">from {info.parentName}</div>
                  {info.description && (
                    <div className="ui-agent-tools__item-desc">{info.description}</div>
                  )}
                </div>
                <button
                  type="button"
                  className="ui-agent-tools__item-remove"
                  onClick={() => removeTool(ref.toolId, ref.toolName)}
                  aria-label={`Remove ${info.toolName}`}
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
