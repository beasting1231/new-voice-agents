import { useEffect, useRef, useState } from "react";
import { Button } from "../../components";
import {
  createChatSession,
  subscribeChatSessions,
  subscribeChatMessages,
  addChatMessage,
  getApiKeys,
  getKnowledgeDocuments,
  subscribeTools,
} from "../../lib/db";
import type { ChatSession, ChatMessage, Agent, Tool, McpToolDefinition } from "../../lib/db";
import { formatFirestoreError } from "../../lib/firestoreError";
import { McpClient } from "../../lib/mcp";

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0 0 6v1a4 4 0 0 0 8 0v-1a3 3 0 0 0 0-6V6a4 4 0 0 0-4-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 2v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}


export type AgentTestingTabProps = {
  agent: Agent;
  projectId: string;
};

// Legacy timezone ID mapping (for backwards compatibility)
const legacyTimezoneMap: Record<string, string> = {
  nyc: "America/New_York",
  la: "America/Los_Angeles",
  london: "Europe/London",
};

function getCurrentDateTimeString(timeZoneId?: string): string {
  // Support both legacy IDs (nyc, la, london) and IANA IDs (America/New_York, etc.)
  const inputId = timeZoneId ?? "America/New_York";
  const tz = legacyTimezoneMap[inputId] ?? inputId;
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const formatted = formatter.format(now);
  const tzName = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(now).find(p => p.type === "timeZoneName")?.value ?? "";

  return `Current date and time: ${formatted} ${tzName}`;
}

// Icon for MCP tool calls
function ToolIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function AgentTestingTab({ agent, projectId }: AgentTestingTabProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [projectTools, setProjectTools] = useState<Tool[]>([]);
  const [expandedToolMessages, setExpandedToolMessages] = useState<Set<string>>(new Set());

  // Subscribe to project tools
  useEffect(() => {
    if (!projectId) return;
    const unsub = subscribeTools(
      projectId,
      (next) => setProjectTools(next),
      (err) => setError(formatFirestoreError(err)),
    );
    return () => unsub();
  }, [projectId]);

  // Subscribe to sessions for this agent
  useEffect(() => {
    const unsub = subscribeChatSessions(
      agent.id,
      (next) => {
        setSessions(next);
        // Auto-select the most recent session if none selected
        if (!activeSessionId && next.length > 0) {
          setActiveSessionId(next[0].id);
        }
      },
      (err) => setError(formatFirestoreError(err)),
    );
    return () => unsub();
  }, [agent.id, activeSessionId]);

  // Subscribe to messages for active session
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeChatMessages(
      activeSessionId,
      (next) => setMessages(next),
      (err) => setError(formatFirestoreError(err)),
    );
    return () => unsub();
  }, [activeSessionId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewSession = async () => {
    try {
      const sessionId = await createChatSession(agent.id, projectId);
      setActiveSessionId(sessionId);
      setError(null);

      // If agent speaks first, add the first message
      if (agent.agentSpeaksFirst && agent.firstMessage) {
        await addChatMessage(sessionId, "assistant", agent.firstMessage);
      }
    } catch (err) {
      setError(formatFirestoreError(err));
    }
  };

  // Get MCP tools assigned to this agent with their definitions
  const getAgentMcpTools = (): Array<{ toolRef: { toolId: string; toolName: string }; definition: McpToolDefinition; serverUrl: string }> => {
    if (!agent.tools || agent.tools.length === 0) return [];

    const result: Array<{ toolRef: { toolId: string; toolName: string }; definition: McpToolDefinition; serverUrl: string }> = [];

    for (const toolRef of agent.tools) {
      // Find the parent Tool document
      const parentTool = projectTools.find(t => t.id === toolRef.toolId);
      if (!parentTool || parentTool.type !== "n8n") continue;

      // Find the specific tool definition
      const toolDef = parentTool.availableTools?.find(
        (t: McpToolDefinition) => t.name === toolRef.toolName
      );
      if (!toolDef) continue;

      result.push({
        toolRef,
        definition: toolDef,
        serverUrl: parentTool.serverUrl ?? "",
      });
    }

    return result;
  };

  // Tool definitions for each provider
  const getOpenAITools = (hasKnowledge: boolean) => {
    const tools: Array<{ type: "function"; function: { name: string; description: string; parameters: object } }> = [];

    // Add knowledge base tool if available
    if (hasKnowledge) {
      tools.push({
        type: "function" as const,
        function: {
          name: "search_knowledge_base",
          description: "Search the knowledge base for relevant information to answer the user's question. Use this when you need specific information or facts that might be in the uploaded documents.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find relevant information"
              }
            },
            required: ["query"]
          }
        }
      });
    }

    // Add MCP tools
    for (const mcpTool of getAgentMcpTools()) {
      tools.push({
        type: "function" as const,
        function: {
          name: mcpTool.definition.name,
          description: mcpTool.definition.description ?? "",
          parameters: mcpTool.definition.inputSchema ?? { type: "object", properties: {} }
        }
      });
    }

    return tools;
  };

  const getAnthropicTools = (hasKnowledge: boolean) => {
    const tools: Array<{ name: string; description: string; input_schema: object }> = [];

    // Add knowledge base tool if available
    if (hasKnowledge) {
      tools.push({
        name: "search_knowledge_base",
        description: "Search the knowledge base for relevant information to answer the user's question. Use this when you need specific information or facts that might be in the uploaded documents.",
        input_schema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to find relevant information"
            }
          },
          required: ["query"]
        }
      });
    }

    // Add MCP tools
    for (const mcpTool of getAgentMcpTools()) {
      tools.push({
        name: mcpTool.definition.name,
        description: mcpTool.definition.description ?? "",
        input_schema: mcpTool.definition.inputSchema ?? { type: "object", properties: {} }
      });
    }

    return tools;
  };

  // Sanitize JSON Schema for Gemini API (remove unsupported fields)
  const sanitizeSchemaForGemini = (schema: Record<string, unknown>): Record<string, unknown> => {
    const unsupportedFields = ["$schema", "additionalProperties", "$id", "$ref", "$defs", "definitions"];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(schema)) {
      if (unsupportedFields.includes(key)) continue;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        result[key] = sanitizeSchemaForGemini(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        result[key] = value.map(item =>
          item && typeof item === "object" ? sanitizeSchemaForGemini(item as Record<string, unknown>) : item
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  };

  const getGeminiTools = (hasKnowledge: boolean) => {
    const functionDeclarations: Array<{ name: string; description: string; parameters: object }> = [];

    // Add knowledge base tool if available
    if (hasKnowledge) {
      functionDeclarations.push({
        name: "search_knowledge_base",
        description: "Search the knowledge base for relevant information to answer the user's question. Use this when you need specific information or facts that might be in the uploaded documents.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to find relevant information"
            }
          },
          required: ["query"]
        }
      });
    }

    // Add MCP tools (sanitize schema for Gemini)
    for (const mcpTool of getAgentMcpTools()) {
      console.log("[MCP Tool] Original schema:", JSON.stringify(mcpTool.definition.inputSchema, null, 2));
      const sanitizedParams = mcpTool.definition.inputSchema
        ? sanitizeSchemaForGemini(mcpTool.definition.inputSchema as Record<string, unknown>)
        : { type: "object", properties: {} };
      console.log("[MCP Tool] Sanitized schema:", JSON.stringify(sanitizedParams, null, 2));

      functionDeclarations.push({
        name: mcpTool.definition.name,
        description: mcpTool.definition.description ?? "",
        parameters: sanitizedParams
      });
    }

    return functionDeclarations.length > 0 ? [{ functionDeclarations }] : [];
  };

  // Execute an MCP tool
  const executeMcpTool = async (toolName: string, args: Record<string, unknown>): Promise<string> => {
    const mcpTools = getAgentMcpTools();
    const mcpTool = mcpTools.find(t => t.definition.name === toolName);

    if (!mcpTool) {
      throw new Error(`MCP tool ${toolName} not found`);
    }

    console.log("[MCP] Executing tool:", toolName, "with args:", args, "on server:", mcpTool.serverUrl);

    const client = new McpClient({ serverUrl: mcpTool.serverUrl });
    try {
      await client.connect();
      const result = await client.callTool(toolName, args);

      // Extract text content from result
      const textContent = result.content
        ?.filter(c => c.type === "text" && c.text)
        .map(c => c.text)
        .join("\n");

      return textContent || JSON.stringify(result);
    } finally {
      client.disconnect();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSessionId || sending) return;

    const userMessage = input.trim();
    setInput("");
    setSending(true);
    setError(null);

    try {
      // Add user message
      await addChatMessage(activeSessionId, "user", userMessage);

      // Get API keys (we'll fetch knowledge only if LLM requests it)
      const apiKeys = await getApiKeys(projectId);

      // Determine which provider to use based on agent config
      const provider = agent.llmProviderId ?? "openai";
      const model = agent.llmModelId ?? "gpt-4.1";

      let apiKey: string | undefined;
      if (provider === "openai") apiKey = apiKeys?.openai;
      else if (provider === "anthropic") apiKey = apiKeys?.anthropic;
      else if (provider === "google") apiKey = apiKeys?.google;

      if (!apiKey) {
        setError(`No API key configured for ${provider}. Add it in API Keys settings.`);
        setSending(false);
        return;
      }

      const dateTimeInfo = getCurrentDateTimeString(agent.timeZoneId);
      const systemPrompt = `${dateTimeInfo}\n\n${agent.systemPrompt ?? ""}`.trim();

      // Check if there are knowledge documents available
      const knowledgeDocs = await getKnowledgeDocuments(agent.id);
      const hasKnowledge = knowledgeDocs.length > 0;
      const mcpTools = getAgentMcpTools();
      const hasMcpTools = mcpTools.length > 0;

      // Build tool hints for system prompt
      let toolHints = "";
      if (hasKnowledge) {
        toolHints += "\n\nYou have access to a knowledge base. Use the search_knowledge_base tool when you need to look up specific information.";
      }
      if (hasMcpTools) {
        const toolNames = mcpTools.map(t => t.definition.name).join(", ");
        toolHints += `\n\nYou have access to the following tools: ${toolNames}. Use them when appropriate to help the user.`;
      }

      // Filter out tool messages from conversation history
      const conversationMessages = messages.filter(m => m.role !== "tool");

      let assistantResponse: string;

      if (provider === "openai") {
        // Build messages for API
        const apiMessages = [
          ...(systemPrompt || toolHints ? [{ role: "system" as const, content: systemPrompt + toolHints }] : []),
          ...conversationMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: userMessage },
        ];

        const openAITools = getOpenAITools(hasKnowledge);
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: apiMessages,
            ...(openAITools.length > 0 && { tools: openAITools }),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message ?? `OpenAI API error: ${response.status}`);
        }

        let data = await response.json();
        let message = data.choices?.[0]?.message;

        // Check if LLM wants to use a tool (loop to handle multiple tool calls)
        while (message?.tool_calls && message.tool_calls.length > 0) {
          const toolCall = message.tool_calls[0];
          const toolName = toolCall.function.name;
          let toolArgs: Record<string, unknown> = {};
          try {
            toolArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            toolArgs = {};
          }

          let toolResult: string;

          if (toolName === "search_knowledge_base") {
            // Log the tool use
            await addChatMessage(activeSessionId, "tool", "Searching knowledge base...", "knowledge_search");

            // Get knowledge content
            const knowledgeContent = knowledgeDocs
              .map((doc) => `--- ${doc.fileName} ---\n${doc.content}`)
              .join("\n\n");

            await addChatMessage(
              activeSessionId,
              "tool",
              `Found ${knowledgeDocs.length} document${knowledgeDocs.length === 1 ? "" : "s"} in knowledge base`,
              "knowledge_found"
            );

            toolResult = knowledgeContent || "No documents found in knowledge base.";
          } else {
            // MCP tool call
            const mcpTool = getAgentMcpTools().find(t => t.definition.name === toolName);

            try {
              toolResult = await executeMcpTool(toolName, toolArgs);
              await addChatMessage(activeSessionId, "tool", `${toolName} completed`, "mcp_result", {
                toolName,
                input: toolArgs,
                output: toolResult,
                serverUrl: mcpTool?.serverUrl,
              });
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : "Unknown error";
              toolResult = `Error calling tool: ${errorMsg}`;
              await addChatMessage(activeSessionId, "tool", `${toolName} failed: ${errorMsg}`, "mcp_error", {
                toolName,
                input: toolArgs,
                error: errorMsg,
                serverUrl: mcpTool?.serverUrl,
              });
            }
          }

          // Continue conversation with tool result
          const followUpMessages = [
            ...apiMessages,
            message,
            {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: toolResult,
            },
          ];

          const followUpResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: model,
              messages: followUpMessages,
              ...(openAITools.length > 0 && { tools: openAITools }),
            }),
          });

          if (!followUpResponse.ok) {
            const errData = await followUpResponse.json().catch(() => ({}));
            throw new Error(errData.error?.message ?? `OpenAI API error: ${followUpResponse.status}`);
          }

          data = await followUpResponse.json();
          message = data.choices?.[0]?.message;

          // Update apiMessages for next iteration if needed
          apiMessages.push(followUpMessages[followUpMessages.length - 2], followUpMessages[followUpMessages.length - 1]);
        }

        assistantResponse = message?.content ?? "No response";
      } else if (provider === "anthropic") {
        // Anthropic message format
        const anthropicMessages: Array<{ role: "user" | "assistant"; content: unknown }> = [
          ...conversationMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: userMessage },
        ];

        const anthropicTools = getAnthropicTools(hasKnowledge);
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 4096,
            system: systemPrompt + toolHints,
            messages: anthropicMessages,
            ...(anthropicTools.length > 0 && { tools: anthropicTools }),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message ?? `Anthropic API error: ${response.status}`);
        }

        let data = await response.json();

        // Check if LLM wants to use a tool (loop to handle multiple tool calls)
        let toolUseBlock = data.content?.find((block: { type: string }) => block.type === "tool_use");
        while (toolUseBlock) {
          const toolName = toolUseBlock.name;
          const toolArgs = toolUseBlock.input || {};

          let toolResult: string;

          if (toolName === "search_knowledge_base") {
            // Log the tool use
            await addChatMessage(activeSessionId, "tool", "Searching knowledge base...", "knowledge_search");

            // Get knowledge content
            const knowledgeContent = knowledgeDocs
              .map((doc) => `--- ${doc.fileName} ---\n${doc.content}`)
              .join("\n\n");

            await addChatMessage(
              activeSessionId,
              "tool",
              `Found ${knowledgeDocs.length} document${knowledgeDocs.length === 1 ? "" : "s"} in knowledge base`,
              "knowledge_found"
            );

            toolResult = knowledgeContent || "No documents found in knowledge base.";
          } else {
            // MCP tool call
            const mcpTool = getAgentMcpTools().find(t => t.definition.name === toolName);

            try {
              toolResult = await executeMcpTool(toolName, toolArgs);
              await addChatMessage(activeSessionId, "tool", `${toolName} completed`, "mcp_result", {
                toolName,
                input: toolArgs,
                output: toolResult,
                serverUrl: mcpTool?.serverUrl,
              });
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : "Unknown error";
              toolResult = `Error calling tool: ${errorMsg}`;
              await addChatMessage(activeSessionId, "tool", `${toolName} failed: ${errorMsg}`, "mcp_error", {
                toolName,
                input: toolArgs,
                error: errorMsg,
                serverUrl: mcpTool?.serverUrl,
              });
            }
          }

          // Continue conversation with tool result
          anthropicMessages.push({ role: "assistant" as const, content: data.content });
          anthropicMessages.push({
            role: "user" as const,
            content: [{
              type: "tool_result" as const,
              tool_use_id: toolUseBlock.id,
              content: toolResult,
            }],
          });

          const followUpResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({
              model: model,
              max_tokens: 4096,
              system: systemPrompt + toolHints,
              messages: anthropicMessages,
              ...(anthropicTools.length > 0 && { tools: anthropicTools }),
            }),
          });

          if (!followUpResponse.ok) {
            const errData = await followUpResponse.json().catch(() => ({}));
            throw new Error(errData.error?.message ?? `Anthropic API error: ${followUpResponse.status}`);
          }

          data = await followUpResponse.json();
          toolUseBlock = data.content?.find((block: { type: string }) => block.type === "tool_use");
        }

        // Extract text response
        const textBlock = data.content?.find((block: { type: string }) => block.type === "text");
        assistantResponse = textBlock?.text ?? "No response";
      } else if (provider === "google") {
        // Google Gemini API format
        const geminiContents: Array<{ role: string; parts: unknown[] }> = [];

        // Add system instruction if present
        const systemInstruction = (systemPrompt + toolHints) ? {
          parts: [{ text: systemPrompt + toolHints }]
        } : undefined;

        // Add conversation history (filter out tool messages)
        for (const m of conversationMessages) {
          geminiContents.push({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          });
        }

        // Add current user message
        geminiContents.push({
          role: "user",
          parts: [{ text: userMessage }]
        });

        const geminiTools = getGeminiTools(hasKnowledge);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: geminiContents,
              ...(systemInstruction && { systemInstruction }),
              ...(geminiTools.length > 0 && { tools: geminiTools }),
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message ?? `Google API error: ${response.status}`);
        }

        let data = await response.json();
        let candidate = data.candidates?.[0];

        // Check if LLM wants to use a tool (loop to handle multiple tool calls)
        let functionCall = candidate?.content?.parts?.find((p: { functionCall?: unknown }) => p.functionCall)?.functionCall;
        while (functionCall) {
          const toolName = functionCall.name;
          const toolArgs = functionCall.args || {};

          let toolResult: string;

          if (toolName === "search_knowledge_base") {
            // Log the tool use
            await addChatMessage(activeSessionId, "tool", "Searching knowledge base...", "knowledge_search");

            // Get knowledge content
            const knowledgeContent = knowledgeDocs
              .map((doc) => `--- ${doc.fileName} ---\n${doc.content}`)
              .join("\n\n");

            await addChatMessage(
              activeSessionId,
              "tool",
              `Found ${knowledgeDocs.length} document${knowledgeDocs.length === 1 ? "" : "s"} in knowledge base`,
              "knowledge_found"
            );

            toolResult = knowledgeContent || "No documents found in knowledge base.";
          } else {
            // MCP tool call
            const mcpTool = getAgentMcpTools().find(t => t.definition.name === toolName);

            try {
              toolResult = await executeMcpTool(toolName, toolArgs);
              await addChatMessage(activeSessionId, "tool", `${toolName} completed`, "mcp_result", {
                toolName,
                input: toolArgs,
                output: toolResult,
                serverUrl: mcpTool?.serverUrl,
              });
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : "Unknown error";
              toolResult = `Error calling tool: ${errorMsg}`;
              await addChatMessage(activeSessionId, "tool", `${toolName} failed: ${errorMsg}`, "mcp_error", {
                toolName,
                input: toolArgs,
                error: errorMsg,
                serverUrl: mcpTool?.serverUrl,
              });
            }
          }

          // Continue conversation with tool result
          geminiContents.push(candidate.content);
          geminiContents.push({
            role: "user",
            parts: [{
              functionResponse: {
                name: toolName,
                response: { content: toolResult }
              }
            }]
          });

          const followUpResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: geminiContents,
                ...(systemInstruction && { systemInstruction }),
                ...(geminiTools.length > 0 && { tools: geminiTools }),
              }),
            }
          );

          if (!followUpResponse.ok) {
            const errData = await followUpResponse.json().catch(() => ({}));
            throw new Error(errData.error?.message ?? `Google API error: ${followUpResponse.status}`);
          }

          data = await followUpResponse.json();
          candidate = data.candidates?.[0];
          functionCall = candidate?.content?.parts?.find((p: { functionCall?: unknown }) => p.functionCall)?.functionCall;
        }

        assistantResponse = candidate?.content?.parts?.[0]?.text ?? "No response";
      } else {
        throw new Error(`Provider ${provider} not yet supported for testing`);
      }

      // Add "generating" message and assistant message
      await addChatMessage(activeSessionId, "tool", `Generated response with ${model}`, "thinking");
      await addChatMessage(activeSessionId, "assistant", assistantResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: unknown) => {
    if (!timestamp) return "";
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === "object" && "toDate" in timestamp) {
      date = (timestamp as { toDate: () => Date }).toDate();
    } else {
      return "";
    }
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatSessionTime = (timestamp: unknown) => {
    if (!timestamp) return "New session";
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === "object" && "toDate" in timestamp) {
      date = (timestamp as { toDate: () => Date }).toDate();
    } else {
      return "New session";
    }
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="ui-testing-tab">
      <div className="ui-testing-chat">
        <div className="ui-testing-chat__header">
          <span>Chat</span>
          <Button type="button" variant="secondary" onClick={handleNewSession}>
            <PlusIcon /> New chat
          </Button>
        </div>

        {error && <div className="ui-testing-error">{error}</div>}

        {!activeSessionId ? (
          <div className="ui-testing-chat__empty">
            <p>Start a new chat to test your agent</p>
            <Button type="button" onClick={handleNewSession}>
              Start chat
            </Button>
          </div>
        ) : (
          <>
            <div className="ui-testing-chat__messages">
              {messages.length === 0 ? (
                <div className="ui-testing-chat__empty-messages">
                  Send a message to start the conversation
                </div>
              ) : (
                messages.map((msg) => {
                  const isExpanded = expandedToolMessages.has(msg.id);
                  const hasDetails = msg.toolDetails && (msg.toolDetails.input || msg.toolDetails.output || msg.toolDetails.error);
                  const toggleExpand = () => {
                    setExpandedToolMessages(prev => {
                      const next = new Set(prev);
                      if (next.has(msg.id)) {
                        next.delete(msg.id);
                      } else {
                        next.add(msg.id);
                      }
                      return next;
                    });
                  };

                  return msg.role === "tool" ? (
                    <div
                      key={msg.id}
                      className={`ui-tool-activity ${msg.toolType === "mcp_error" ? "ui-tool-activity--error" : "ui-tool-activity--done"} ${hasDetails ? "ui-tool-activity--expandable" : ""} ${isExpanded ? "ui-tool-activity--expanded" : ""}`}
                    >
                      <button
                        type="button"
                        className="ui-tool-activity__header"
                        onClick={hasDetails ? toggleExpand : undefined}
                        disabled={!hasDetails}
                      >
                        <span className="ui-tool-activity__icon">
                          {msg.toolType === "knowledge_search" && <SearchIcon />}
                          {msg.toolType === "knowledge_found" && <BookIcon />}
                          {msg.toolType === "thinking" && <BrainIcon />}
                          {(msg.toolType === "mcp_call" || msg.toolType === "mcp_result" || msg.toolType === "mcp_error") && <ToolIcon />}
                        </span>
                        <span className="ui-tool-activity__message">{msg.content}</span>
                        {hasDetails && (
                          <span className={`ui-tool-activity__chevron ${isExpanded ? "is-expanded" : ""}`}>
                            <ChevronRightIcon />
                          </span>
                        )}
                        {!hasDetails && msg.toolType !== "mcp_error" && (
                          <span className="ui-tool-activity__check">
                            <CheckIcon />
                          </span>
                        )}
                      </button>
                      {isExpanded && msg.toolDetails && (
                        <div className="ui-tool-activity__details">
                          {msg.toolDetails.input && Object.keys(msg.toolDetails.input).length > 0 && (
                            <div className="ui-tool-activity__detail-section">
                              <div className="ui-tool-activity__detail-label">Input</div>
                              <pre className="ui-tool-activity__detail-content">
                                {JSON.stringify(msg.toolDetails.input, null, 2)}
                              </pre>
                            </div>
                          )}
                          {msg.toolDetails.output && (
                            <div className="ui-tool-activity__detail-section">
                              <div className="ui-tool-activity__detail-label">Output</div>
                              <pre className="ui-tool-activity__detail-content">
                                {msg.toolDetails.output}
                              </pre>
                            </div>
                          )}
                          {msg.toolDetails.error && (
                            <div className="ui-tool-activity__detail-section ui-tool-activity__detail-section--error">
                              <div className="ui-tool-activity__detail-label">Error</div>
                              <pre className="ui-tool-activity__detail-content">
                                {msg.toolDetails.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      key={msg.id}
                      className={`ui-chat-message ui-chat-message--${msg.role}`}
                    >
                      <div className="ui-chat-message__bubble">
                        {msg.content}
                      </div>
                      <div className="ui-chat-message__time">{formatTime(msg.createdAt)}</div>
                    </div>
                  );
                })
              )}
              {sending && (
                <div className="ui-chat-message ui-chat-message--assistant">
                  <div className="ui-chat-message__bubble ui-chat-message__bubble--typing">
                    <span className="ui-typing-dot"></span>
                    <span className="ui-typing-dot"></span>
                    <span className="ui-typing-dot"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="ui-testing-chat__input">
              <input
                type="text"
                className="ui-input"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sending}
              />
              <button
                type="button"
                className="ui-testing-chat__send"
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                <SendIcon />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="ui-testing-logs">
        <div className="ui-testing-logs__header">
          <span>Sessions</span>
        </div>
        <div className="ui-testing-logs__list">
          {sessions.length === 0 ? (
            <div className="ui-testing-logs__empty">No chat sessions yet</div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={`ui-testing-logs__item ${activeSessionId === session.id ? "is-active" : ""}`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <div className="ui-testing-logs__item-title">
                  Chat session
                </div>
                <div className="ui-testing-logs__item-time">
                  {formatSessionTime(session.updatedAt ?? session.createdAt)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
