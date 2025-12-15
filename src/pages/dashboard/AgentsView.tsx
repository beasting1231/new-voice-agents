import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Field, IconButton, SelectMenu, Switch, Tabs, type SelectMenuItem, type TabItem } from "../../components";
import { useAuth } from "../../auth";
import { subscribeAgent, updateAgent } from "../../lib/db";
import type { Agent } from "../../lib/db";
import { formatFirestoreError } from "../../lib/firestoreError";
import { AgentTestingTab } from "./AgentTestingTab";
import { AgentKnowledgeTab } from "./AgentKnowledgeTab";

type AgentTabId = "configuration" | "tools" | "knowledge" | "testing";
type AgentModeId = "text" | "voice";

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M11.6 4.3l4.1 4.1M4.2 15.8l3.7-.8L16.8 6.1a1.6 1.6 0 0 0 0-2.3l-.6-.6a1.6 1.6 0 0 0-2.3 0L5 12l-.8 3.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type AgentsViewProps = {
  selectedProjectId: string;
  selectedSubItemId?: string;
  agentCount: number;
  onCreateAgent?: () => void;
};

export function AgentsView({ selectedProjectId, selectedSubItemId, agentCount, onCreateAgent }: AgentsViewProps) {
  const { user } = useAuth();
  const tabs: TabItem<AgentTabId>[] = useMemo(
    () => [
      { id: "configuration", label: "Configuration" },
      { id: "tools", label: "Tools" },
      { id: "testing", label: "Testing" },
      { id: "knowledge", label: "Knowledge" },
    ],
    [],
  );

  const modeItems: TabItem<AgentModeId>[] = useMemo(
    () => [
      { id: "text", label: "Text" },
      { id: "voice", label: "Voice" },
    ],
    [],
  );

  const voiceItems: SelectMenuItem[] = useMemo(
    () => [
      { id: "alloy", label: "Alloy (Neutral, balanced)" },
      { id: "aria", label: "Aria (Bright, upbeat)" },
      { id: "sage", label: "Sage (Calm, thoughtful)" },
    ],
    [],
  );

  const llmProviderItems: SelectMenuItem[] = useMemo(
    () => [
      { id: "openai", label: "OpenAI" },
      { id: "anthropic", label: "Anthropic" },
      { id: "google", label: "Google" },
    ],
    [],
  );

  const llmModelItemsByProviderId: Record<string, SelectMenuItem[]> = useMemo(
    () => ({
      openai: [
        { id: "gpt-4.1", label: "GPT-4.1" },
        { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
        { id: "gpt-4o", label: "GPT-4o" },
        { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      ],
      anthropic: [
        { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
        { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
        { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
        { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
      ],
      google: [
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
        { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
        { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      ],
    }),
    [],
  );

  const timeZoneItems: SelectMenuItem[] = useMemo(
    () => [
      { id: "nyc", label: "Eastern Time – New York (UTC-5:00)" },
      { id: "la", label: "Pacific Time – Los Angeles (UTC-8:00)" },
      { id: "london", label: "London (UTC+0:00)" },
    ],
    [],
  );

  const [tabId, setTabId] = useState<AgentTabId>("configuration");
  const [editingName, setEditingName] = useState(false);

  const [agent, setAgent] = useState<Agent | null>(null);
  const [draft, setDraft] = useState<Partial<Agent>>({});
  const lastLoadedAgentId = useRef<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  const [modeId, setModeId] = useState<AgentModeId>("voice");
  const [voiceId, setVoiceId] = useState("alloy");
  const [llmProviderId, setLlmProviderId] = useState("openai");
  const [llmModelId, setLlmModelId] = useState("gpt-4.1");
  const [agentSpeaksFirst, setAgentSpeaksFirst] = useState(false);
  const [firstMessage, setFirstMessage] = useState("");
  const [timeZoneId, setTimeZoneId] = useState("nyc");
  const [systemPrompt, setSystemPrompt] = useState("");

  const [saving, setSaving] = useState(false);

  const selectedAgentId = selectedSubItemId;

  useEffect(() => {
    if (!user) return;
    if (!selectedProjectId) return;
    if (!selectedAgentId) {
      setAgent(null);
      return;
    }
    const unsub = subscribeAgent(
      selectedAgentId,
      (next) => {
        setDbError(null);
        setAgent(next);
      },
      (err) => setDbError(formatFirestoreError(err)),
    );
    return () => unsub();
  }, [selectedAgentId, selectedProjectId, user]);

  useEffect(() => {
    if (!agent) return;
    if (agent.projectId !== selectedProjectId) return;

    if (lastLoadedAgentId.current === agent.id) return;
    lastLoadedAgentId.current = agent.id;

    setDraft({});
    setModeId((agent.mode as AgentModeId) ?? "voice");
    setVoiceId(agent.voiceId ?? "alloy");
    setLlmProviderId(agent.llmProviderId ?? "openai");
    setLlmModelId(agent.llmModelId ?? (llmModelItemsByProviderId[agent.llmProviderId ?? "openai"]?.[0]?.id ?? ""));
    setAgentSpeaksFirst(Boolean(agent.agentSpeaksFirst));
    setFirstMessage(agent.firstMessage ?? "");
    setTimeZoneId(agent.timeZoneId ?? "nyc");
    setSystemPrompt(agent.systemPrompt ?? "");
  }, [agent, llmModelItemsByProviderId, selectedProjectId]);

  const agentName = draft.name ?? agent?.name ?? "Agent";

  const dirty = (() => {
    if (!agent) return false;
    return (
      agentName !== agent.name ||
      modeId !== (agent.mode ?? "voice") ||
      voiceId !== (agent.voiceId ?? "alloy") ||
      llmProviderId !== (agent.llmProviderId ?? "openai") ||
      llmModelId !== (agent.llmModelId ?? "gpt-4.1") ||
      agentSpeaksFirst !== Boolean(agent.agentSpeaksFirst) ||
      firstMessage !== (agent.firstMessage ?? "") ||
      timeZoneId !== (agent.timeZoneId ?? "nyc") ||
      systemPrompt !== (agent.systemPrompt ?? "")
    );
  })();

  if (agentCount === 0) {
    return (
      <div className="ui-page">
        <div className="ui-empty-state">
          <div className="ui-empty-state__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="ui-empty-state__title">Create your first agent</h2>
          <p className="ui-empty-state__description">
            Agents are AI assistants that can handle voice or text conversations. Get started by creating one.
          </p>
          <Button type="button" onClick={onCreateAgent}>
            Create agent
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      {dbError ? <div className="ui-dashboard-content__empty">{dbError}</div> : null}
      <div className="ui-panel">
        <div className="ui-panel__top">
          <div className="ui-panel__title-block">
            <div className="ui-panel__kicker">Agent</div>
          <div className="ui-panel__title-row">
              {!editingName ? (
                <>
                  <div className="ui-panel__title">{agentName}</div>
                  <IconButton icon={<PencilIcon />} label="Edit name" onClick={() => setEditingName(true)} />
                </>
              ) : (
                <div className="ui-panel__title-edit">
                  <input
                    className="ui-input ui-input--title"
                    value={agentName}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    autoFocus
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setEditingName(false);
                        if (agent && agentName.trim() && agentName !== agent.name) {
                          try {
                            await updateAgent(agent.id, { name: agentName.trim() });
                            setDraft((d) => {
                              const { name: _, ...rest } = d;
                              return rest;
                            });
                          } catch (err) {
                            setDbError(formatFirestoreError(err));
                          }
                        }
                      }
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setDraft((d) => {
                          const { name: _, ...rest } = d;
                          return rest;
                        });
                      }
                    }}
                    onBlur={async () => {
                      setEditingName(false);
                      if (agent && agentName.trim() && agentName !== agent.name) {
                        try {
                          await updateAgent(agent.id, { name: agentName.trim() });
                          setDraft((d) => {
                            const { name: _, ...rest } = d;
                            return rest;
                          });
                        } catch (err) {
                          setDbError(formatFirestoreError(err));
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="ui-save"
            disabled={!user || !agent || !dirty || saving}
            onClick={async () => {
              if (!user) return;
              if (!agent) return;
              setSaving(true);
              try {
                try {
                  await updateAgent(agent.id, {
                    name: agentName,
                    mode: modeId,
                    voiceId: modeId === "voice" ? voiceId : undefined,
                    llmProviderId: modeId === "text" ? llmProviderId : undefined,
                    llmModelId: modeId === "text" ? llmModelId : undefined,
                    agentSpeaksFirst,
                    firstMessage: agentSpeaksFirst ? firstMessage : undefined,
                    systemPrompt,
                    timeZoneId,
                  });
                  setDbError(null);
                } catch (err) {
                  setDbError(formatFirestoreError(err));
                }
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        <div className="ui-panel__body">
          <Tabs items={tabs} valueId={tabId} onChangeValueId={setTabId} />

          {!selectedAgentId || !agent ? (
            <div className="ui-panel__placeholder">
              <div className="ui-placeholder-card">
                <div className="ui-placeholder-card__title">Loading...</div>
                <div className="ui-placeholder-card__body">Loading agent configuration.</div>
              </div>
            </div>
          ) : tabId === "configuration" ? (
            <div className="ui-form">
              <div className="ui-form__row">
                <div className="ui-form__label">Mode</div>
                <div className="ui-form__control">
                  <Tabs
                    items={modeItems}
                    valueId={modeId}
                    onChangeValueId={(id) => {
                      setModeId(id);
                      if (agent) setDraft((d) => ({ ...d, mode: id }));
                    }}
                  />
                </div>
              </div>

              {modeId === "voice" && (
                <Field label="Voice">
                  <SelectMenu
                    className="ui-select-menu--compact"
                    label="Voice"
                    showLabel={false}
                    items={voiceItems}
                    valueId={voiceId}
                    onChangeValueId={(id) => {
                      setVoiceId(id);
                      if (agent) setDraft((d) => ({ ...d, voiceId: id }));
                    }}
                  />
                </Field>
              )}

              {modeId === "text" && (
                <>
                  <Field label="Provider">
                    <SelectMenu
                      className="ui-select-menu--compact"
                      label="Provider"
                      showLabel={false}
                      items={llmProviderItems}
                      valueId={llmProviderId}
                      onChangeValueId={(id) => {
                        setLlmProviderId(id);
                        const models = llmModelItemsByProviderId[id] ?? [];
                        setLlmModelId(models[0]?.id ?? "");
                        if (agent) setDraft((d) => ({ ...d, llmProviderId: id, llmModelId: models[0]?.id ?? "" }));
                      }}
                    />
                  </Field>
                  <Field label="Model">
                    <SelectMenu
                      className="ui-select-menu--compact"
                      label="Model"
                      showLabel={false}
                      items={llmModelItemsByProviderId[llmProviderId] ?? []}
                      valueId={llmModelId}
                      onChangeValueId={(id) => {
                        setLlmModelId(id);
                        if (agent) setDraft((d) => ({ ...d, llmModelId: id }));
                      }}
                    />
                  </Field>
                </>
              )}

              <div className="ui-form__row">
                <Switch
                  checked={agentSpeaksFirst}
                  onChangeChecked={(v) => {
                    setAgentSpeaksFirst(v);
                    if (agent) setDraft((d) => ({ ...d, agentSpeaksFirst: v }));
                  }}
                  label="Agent speaks first"
                />
              </div>

              {agentSpeaksFirst && (
                <Field label="First message" hint="The message the agent sends to start the conversation">
                  <textarea
                    className="ui-textarea"
                    rows={3}
                    value={firstMessage}
                    onChange={(e) => {
                      setFirstMessage(e.target.value);
                      if (agent) setDraft((d) => ({ ...d, firstMessage: e.target.value }));
                    }}
                    placeholder="Hello! How can I help you today?"
                  />
                </Field>
              )}

              <Field label="System prompt">
                <textarea
                  className="ui-textarea"
                  rows={6}
                  value={systemPrompt}
                  onChange={(e) => {
                    setSystemPrompt(e.target.value);
                    if (agent) setDraft((d) => ({ ...d, systemPrompt: e.target.value }));
                  }}
                />
              </Field>

              <Field label="Timezone">
                <SelectMenu
                  className="ui-select-menu--compact"
                  label="Timezone"
                  showLabel={false}
                  items={timeZoneItems}
                  valueId={timeZoneId}
                  onChangeValueId={(id) => {
                    setTimeZoneId(id);
                    if (agent) setDraft((d) => ({ ...d, timeZoneId: id }));
                  }}
                />
              </Field>
            </div>
          ) : tabId === "testing" ? (
            agent.mode === "text" || !agent.mode ? (
              <AgentTestingTab agent={agent} projectId={selectedProjectId} />
            ) : (
              <div className="ui-panel__placeholder">
                <div className="ui-placeholder-card">
                  <div className="ui-placeholder-card__title">Voice Testing</div>
                  <div className="ui-placeholder-card__body">
                    Voice testing is coming soon. Switch to Text mode in Configuration to test via chat.
                  </div>
                </div>
              </div>
            )
          ) : tabId === "knowledge" ? (
            <AgentKnowledgeTab agent={agent} projectId={selectedProjectId} />
          ) : (
            <div className="ui-panel__placeholder">
              <div className="ui-placeholder-card">
                <div className="ui-placeholder-card__title">Tools</div>
                <div className="ui-placeholder-card__body">Mock UI for now — we'll build this next.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
