import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Field, IconButton, SelectMenu, Switch, Tabs, type SelectMenuItem, type TabItem } from "../../components";
import { useAuth } from "../../auth";
import { subscribeAgent, updateAgent } from "../../lib/db";
import type { Agent, Tool } from "../../lib/db";
import { formatFirestoreError } from "../../lib/firestoreError";
import { AgentTestingTab } from "./AgentTestingTab";
import { AgentKnowledgeTab } from "./AgentKnowledgeTab";
import { AgentToolsTab } from "./AgentToolsTab";

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
  tools?: Tool[];
  onCreateAgent?: () => void;
};

export function AgentsView({ selectedProjectId, selectedSubItemId, agentCount, tools = [], onCreateAgent }: AgentsViewProps) {
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
        { id: "gemini-3.0-flash", label: "Gemini 3.0 Flash" },
        { id: "gemini-3.0-pro", label: "Gemini 3.0 Pro" },
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
      // North America
      { id: "America/New_York", label: "New York (EST, UTC-5)" },
      { id: "America/Chicago", label: "Chicago (CST, UTC-6)" },
      { id: "America/Denver", label: "Denver (MST, UTC-7)" },
      { id: "America/Los_Angeles", label: "Los Angeles (PST, UTC-8)" },
      { id: "America/Anchorage", label: "Anchorage (AKST, UTC-9)" },
      { id: "Pacific/Honolulu", label: "Honolulu (HST, UTC-10)" },
      { id: "America/Phoenix", label: "Phoenix (MST, UTC-7)" },
      { id: "America/Toronto", label: "Toronto (EST, UTC-5)" },
      { id: "America/Vancouver", label: "Vancouver (PST, UTC-8)" },
      { id: "America/Montreal", label: "Montreal (EST, UTC-5)" },
      { id: "America/Mexico_City", label: "Mexico City (CST, UTC-6)" },
      // South America
      { id: "America/Sao_Paulo", label: "São Paulo (BRT, UTC-3)" },
      { id: "America/Buenos_Aires", label: "Buenos Aires (ART, UTC-3)" },
      { id: "America/Bogota", label: "Bogotá (COT, UTC-5)" },
      { id: "America/Lima", label: "Lima (PET, UTC-5)" },
      { id: "America/Santiago", label: "Santiago (CLT, UTC-3)" },
      // Europe
      { id: "Europe/London", label: "London (GMT, UTC+0)" },
      { id: "Europe/Paris", label: "Paris (CET, UTC+1)" },
      { id: "Europe/Berlin", label: "Berlin (CET, UTC+1)" },
      { id: "Europe/Madrid", label: "Madrid (CET, UTC+1)" },
      { id: "Europe/Rome", label: "Rome (CET, UTC+1)" },
      { id: "Europe/Amsterdam", label: "Amsterdam (CET, UTC+1)" },
      { id: "Europe/Brussels", label: "Brussels (CET, UTC+1)" },
      { id: "Europe/Vienna", label: "Vienna (CET, UTC+1)" },
      { id: "Europe/Zurich", label: "Zurich (CET, UTC+1)" },
      { id: "Europe/Stockholm", label: "Stockholm (CET, UTC+1)" },
      { id: "Europe/Oslo", label: "Oslo (CET, UTC+1)" },
      { id: "Europe/Copenhagen", label: "Copenhagen (CET, UTC+1)" },
      { id: "Europe/Helsinki", label: "Helsinki (EET, UTC+2)" },
      { id: "Europe/Athens", label: "Athens (EET, UTC+2)" },
      { id: "Europe/Istanbul", label: "Istanbul (TRT, UTC+3)" },
      { id: "Europe/Moscow", label: "Moscow (MSK, UTC+3)" },
      { id: "Europe/Warsaw", label: "Warsaw (CET, UTC+1)" },
      { id: "Europe/Prague", label: "Prague (CET, UTC+1)" },
      { id: "Europe/Dublin", label: "Dublin (GMT, UTC+0)" },
      { id: "Europe/Lisbon", label: "Lisbon (WET, UTC+0)" },
      // Middle East
      { id: "Asia/Dubai", label: "Dubai (GST, UTC+4)" },
      { id: "Asia/Riyadh", label: "Riyadh (AST, UTC+3)" },
      { id: "Asia/Tehran", label: "Tehran (IRST, UTC+3:30)" },
      { id: "Asia/Jerusalem", label: "Jerusalem (IST, UTC+2)" },
      { id: "Asia/Kuwait", label: "Kuwait (AST, UTC+3)" },
      { id: "Asia/Qatar", label: "Doha (AST, UTC+3)" },
      // Asia
      { id: "Asia/Tokyo", label: "Tokyo (JST, UTC+9)" },
      { id: "Asia/Shanghai", label: "Shanghai (CST, UTC+8)" },
      { id: "Asia/Hong_Kong", label: "Hong Kong (HKT, UTC+8)" },
      { id: "Asia/Singapore", label: "Singapore (SGT, UTC+8)" },
      { id: "Asia/Seoul", label: "Seoul (KST, UTC+9)" },
      { id: "Asia/Taipei", label: "Taipei (CST, UTC+8)" },
      { id: "Asia/Bangkok", label: "Bangkok (ICT, UTC+7)" },
      { id: "Asia/Jakarta", label: "Jakarta (WIB, UTC+7)" },
      { id: "Asia/Manila", label: "Manila (PHT, UTC+8)" },
      { id: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (MYT, UTC+8)" },
      { id: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City (ICT, UTC+7)" },
      { id: "Asia/Kolkata", label: "Mumbai / Delhi (IST, UTC+5:30)" },
      { id: "Asia/Karachi", label: "Karachi (PKT, UTC+5)" },
      { id: "Asia/Dhaka", label: "Dhaka (BST, UTC+6)" },
      // Oceania
      { id: "Australia/Sydney", label: "Sydney (AEDT, UTC+11)" },
      { id: "Australia/Melbourne", label: "Melbourne (AEDT, UTC+11)" },
      { id: "Australia/Brisbane", label: "Brisbane (AEST, UTC+10)" },
      { id: "Australia/Perth", label: "Perth (AWST, UTC+8)" },
      { id: "Australia/Adelaide", label: "Adelaide (ACDT, UTC+10:30)" },
      { id: "Pacific/Auckland", label: "Auckland (NZDT, UTC+13)" },
      { id: "Pacific/Fiji", label: "Fiji (FJT, UTC+12)" },
      // Africa
      { id: "Africa/Cairo", label: "Cairo (EET, UTC+2)" },
      { id: "Africa/Johannesburg", label: "Johannesburg (SAST, UTC+2)" },
      { id: "Africa/Lagos", label: "Lagos (WAT, UTC+1)" },
      { id: "Africa/Nairobi", label: "Nairobi (EAT, UTC+3)" },
      { id: "Africa/Casablanca", label: "Casablanca (WET, UTC+0)" },
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
  const [timeZoneId, setTimeZoneId] = useState("America/New_York");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");

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
    setTimeZoneId(agent.timeZoneId ?? "America/New_York");
    setSystemPrompt(agent.systemPrompt ?? "");
    setWhatsappEnabled(Boolean(agent.whatsappEnabled));
    setWhatsappNumber(agent.whatsappNumber ?? "");
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
      timeZoneId !== (agent.timeZoneId ?? "America/New_York") ||
      systemPrompt !== (agent.systemPrompt ?? "") ||
      whatsappEnabled !== Boolean(agent.whatsappEnabled) ||
      whatsappNumber !== (agent.whatsappNumber ?? "")
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
                    llmProviderId: llmProviderId,
                    llmModelId: llmModelId,
                    agentSpeaksFirst,
                    firstMessage: agentSpeaksFirst ? firstMessage : undefined,
                    systemPrompt,
                    timeZoneId,
                    whatsappEnabled,
                    whatsappNumber: whatsappEnabled ? whatsappNumber : undefined,
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
                  searchable
                  searchPlaceholder="Search cities..."
                />
              </Field>

              <div className="ui-form__divider" />

              <div className="ui-form__section">
                <div className="ui-form__section-header">
                  <div className="ui-form__section-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="ui-form__section-title">WhatsApp Integration</div>
                </div>

                <div className="ui-form__row">
                  <Switch
                    checked={whatsappEnabled}
                    onChangeChecked={(v) => {
                      setWhatsappEnabled(v);
                      if (agent) setDraft((d) => ({ ...d, whatsappEnabled: v }));
                    }}
                    label="Enable WhatsApp"
                  />
                </div>

                {whatsappEnabled && (
                  <>
                    <Field
                      label="WhatsApp Number"
                      hint="The Twilio WhatsApp number this agent will respond to (must match API Keys)"
                    >
                      <input
                        className="ui-input"
                        value={whatsappNumber}
                        onChange={(e) => {
                          setWhatsappNumber(e.target.value);
                          if (agent) setDraft((d) => ({ ...d, whatsappNumber: e.target.value }));
                        }}
                        placeholder="+1234567890"
                      />
                    </Field>

                    <div className="ui-whatsapp-info">
                      <div className="ui-whatsapp-info__icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M12 7v6M12 16v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="ui-whatsapp-info__content">
                        <strong>Setup Instructions:</strong>
                        <ol>
                          <li>Configure your Twilio WhatsApp number in <strong>API Keys</strong></li>
                          <li>In Twilio Console, set the webhook URL to:<br />
                            <code>https://bastingvoice.web.app/api/whatsapp</code>
                          </li>
                          <li>Users can now message this WhatsApp number to chat with the agent</li>
                        </ol>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
          ) : tabId === "tools" ? (
            <AgentToolsTab agent={agent} tools={tools} onError={(err) => setDbError(err)} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
