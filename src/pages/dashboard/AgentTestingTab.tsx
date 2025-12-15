import { useEffect, useRef, useState } from "react";
import { Button } from "../../components";
import {
  createChatSession,
  subscribeChatSessions,
  subscribeChatMessages,
  addChatMessage,
  getApiKeys,
  getKnowledgeDocuments,
} from "../../lib/db";
import type { ChatSession, ChatMessage, Agent } from "../../lib/db";
import { formatFirestoreError } from "../../lib/firestoreError";

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

// Map timezone IDs to IANA timezone names
const timezoneMap: Record<string, string> = {
  nyc: "America/New_York",
  la: "America/Los_Angeles",
  london: "Europe/London",
};

function getCurrentDateTimeString(timeZoneId?: string): string {
  const tz = timezoneMap[timeZoneId ?? "nyc"] ?? "America/New_York";
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

export function AgentTestingTab({ agent, projectId }: AgentTestingTabProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Tool definitions for each provider
  const getOpenAITools = () => [{
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
  }];

  const getAnthropicTools = () => [{
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
  }];

  const getGeminiTools = () => [{
    functionDeclarations: [{
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
    }]
  }];

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

      // Filter out tool messages from conversation history
      const conversationMessages = messages.filter(m => m.role !== "tool");

      let assistantResponse: string;

      if (provider === "openai") {
        // Build messages for API
        const apiMessages = [
          ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt + (hasKnowledge ? "\n\nYou have access to a knowledge base. Use the search_knowledge_base tool when you need to look up specific information." : "") }] : []),
          ...conversationMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: userMessage },
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: apiMessages,
            ...(hasKnowledge && { tools: getOpenAITools() }),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message ?? `OpenAI API error: ${response.status}`);
        }

        let data = await response.json();
        let message = data.choices?.[0]?.message;

        // Check if LLM wants to use a tool
        if (message?.tool_calls && message.tool_calls.length > 0) {
          const toolCall = message.tool_calls[0];
          if (toolCall.function.name === "search_knowledge_base") {
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

            // Continue conversation with tool result
            const followUpMessages = [
              ...apiMessages,
              message,
              {
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: knowledgeContent || "No documents found in knowledge base.",
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
              }),
            });

            if (!followUpResponse.ok) {
              const errData = await followUpResponse.json().catch(() => ({}));
              throw new Error(errData.error?.message ?? `OpenAI API error: ${followUpResponse.status}`);
            }

            data = await followUpResponse.json();
            message = data.choices?.[0]?.message;
          }
        }

        assistantResponse = message?.content ?? "No response";
      } else if (provider === "anthropic") {
        // Anthropic message format
        const anthropicMessages = [
          ...conversationMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: userMessage },
        ];

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
            system: systemPrompt + (hasKnowledge ? "\n\nYou have access to a knowledge base. Use the search_knowledge_base tool when you need to look up specific information." : ""),
            messages: anthropicMessages,
            ...(hasKnowledge && { tools: getAnthropicTools() }),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message ?? `Anthropic API error: ${response.status}`);
        }

        let data = await response.json();

        // Check if LLM wants to use a tool
        const toolUseBlock = data.content?.find((block: { type: string }) => block.type === "tool_use");
        if (toolUseBlock && toolUseBlock.name === "search_knowledge_base") {
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

          // Continue conversation with tool result
          const followUpMessages = [
            ...anthropicMessages,
            { role: "assistant" as const, content: data.content },
            {
              role: "user" as const,
              content: [{
                type: "tool_result" as const,
                tool_use_id: toolUseBlock.id,
                content: knowledgeContent || "No documents found in knowledge base.",
              }],
            },
          ];

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
              system: systemPrompt,
              messages: followUpMessages,
            }),
          });

          if (!followUpResponse.ok) {
            const errData = await followUpResponse.json().catch(() => ({}));
            throw new Error(errData.error?.message ?? `Anthropic API error: ${followUpResponse.status}`);
          }

          data = await followUpResponse.json();
        }

        // Extract text response
        const textBlock = data.content?.find((block: { type: string }) => block.type === "text");
        assistantResponse = textBlock?.text ?? "No response";
      } else if (provider === "google") {
        // Google Gemini API format
        const geminiContents = [];

        // Add system instruction if present
        const systemInstruction = (systemPrompt + (hasKnowledge ? "\n\nYou have access to a knowledge base. Use the search_knowledge_base function when you need to look up specific information." : "")) ? {
          parts: [{ text: systemPrompt + (hasKnowledge ? "\n\nYou have access to a knowledge base. Use the search_knowledge_base function when you need to look up specific information." : "") }]
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
              ...(hasKnowledge && { tools: getGeminiTools() }),
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message ?? `Google API error: ${response.status}`);
        }

        let data = await response.json();
        let candidate = data.candidates?.[0];

        // Check if LLM wants to use a tool
        const functionCall = candidate?.content?.parts?.find((p: { functionCall?: unknown }) => p.functionCall)?.functionCall;
        if (functionCall && functionCall.name === "search_knowledge_base") {
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

          // Continue conversation with tool result
          const followUpContents = [
            ...geminiContents,
            candidate.content,
            {
              role: "user",
              parts: [{
                functionResponse: {
                  name: "search_knowledge_base",
                  response: { content: knowledgeContent || "No documents found in knowledge base." }
                }
              }]
            }
          ];

          const followUpResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: followUpContents,
                ...(systemInstruction && { systemInstruction }),
              }),
            }
          );

          if (!followUpResponse.ok) {
            const errData = await followUpResponse.json().catch(() => ({}));
            throw new Error(errData.error?.message ?? `Google API error: ${followUpResponse.status}`);
          }

          data = await followUpResponse.json();
          candidate = data.candidates?.[0];
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
                messages.map((msg) => (
                  msg.role === "tool" ? (
                    <div key={msg.id} className="ui-tool-activity ui-tool-activity--done">
                      <span className="ui-tool-activity__icon">
                        {msg.toolType === "knowledge_search" && <SearchIcon />}
                        {msg.toolType === "knowledge_found" && <BookIcon />}
                        {msg.toolType === "thinking" && <BrainIcon />}
                      </span>
                      <span className="ui-tool-activity__message">{msg.content}</span>
                      <span className="ui-tool-activity__check">
                        <CheckIcon />
                      </span>
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
                  )
                ))
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
