import { useEffect, useState } from "react";
import { Button } from "../../components";
import { useAuth } from "../../auth";
import { subscribeApiKeys, updateApiKeys } from "../../lib/db";
import type { ApiKeys } from "../../lib/db";
import { formatFirestoreError } from "../../lib/firestoreError";

type ProviderConfig = {
  id: keyof Omit<ApiKeys, "id" | "projectId" | "updatedAt">;
  label: string;
  placeholder: string;
  hint: string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    hint: "Used for GPT models. Get your key at platform.openai.com",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-...",
    hint: "Used for Claude models. Get your key at console.anthropic.com",
  },
  {
    id: "google",
    label: "Google AI",
    placeholder: "AIza...",
    hint: "Used for Gemini models. Get your key at aistudio.google.com",
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    placeholder: "xi-...",
    hint: "Used for text-to-speech voices. Get your key at elevenlabs.io",
  },
  {
    id: "deepgram",
    label: "Deepgram",
    placeholder: "",
    hint: "Used for speech-to-text. Get your key at deepgram.com",
  },
];

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10 4C4 4 1 10 1 10s3 6 9 6 9-6 9-6-3-6-9-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 3l14 14M10 4C4 4 1 10 1 10s1.5 3 5 5M10 16c6 0 9-6 9-6s-1.5-3-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 7a3 3 0 0 1 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export type ApiKeysViewProps = {
  selectedProjectId: string;
};

export function ApiKeysView({ selectedProjectId }: ApiKeysViewProps) {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [draft, setDraft] = useState<Partial<ApiKeys>>({});
  const [dbError, setDbError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    if (!selectedProjectId) return;
    const unsub = subscribeApiKeys(
      selectedProjectId,
      (next) => {
        setDbError(null);
        setApiKeys(next);
        setDraft({});
      },
      (err) => setDbError(formatFirestoreError(err)),
    );
    return () => unsub();
  }, [selectedProjectId, user]);

  const toggleVisibility = (id: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getValue = (id: keyof Omit<ApiKeys, "id" | "projectId" | "updatedAt">) => {
    if (id in draft) return draft[id] ?? "";
    return apiKeys?.[id] ?? "";
  };

  const handleChange = (id: keyof Omit<ApiKeys, "id" | "projectId" | "updatedAt">, value: string) => {
    setDraft((d) => ({ ...d, [id]: value }));
  };

  const dirty = (() => {
    for (const provider of PROVIDERS) {
      const draftVal = draft[provider.id];
      if (draftVal !== undefined && draftVal !== (apiKeys?.[provider.id] ?? "")) {
        return true;
      }
    }
    return false;
  })();

  const handleSave = async () => {
    if (!user || !selectedProjectId || !dirty) return;
    setSaving(true);
    try {
      const updates: Partial<Omit<ApiKeys, "id" | "projectId" | "updatedAt">> = {};
      for (const provider of PROVIDERS) {
        const draftVal = draft[provider.id];
        if (draftVal !== undefined) {
          updates[provider.id] = draftVal;
        }
      }
      await updateApiKeys(selectedProjectId, updates);
      setDbError(null);
      setDraft({});
    } catch (err) {
      setDbError(formatFirestoreError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ui-page">
      {dbError ? <div className="ui-dashboard-content__empty">{dbError}</div> : null}
      <div className="ui-panel">
        <div className="ui-panel__top">
          <div className="ui-panel__title-block">
            <div className="ui-panel__kicker">Settings</div>
            <div className="ui-panel__title">API Keys</div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="ui-save"
            disabled={!user || !dirty || saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>

        <div className="ui-panel__body">
          <p className="ui-api-keys-description">
            Enter your API keys for each provider. Keys are stored securely and used to make calls to each service.
          </p>

          <div className="ui-api-keys-form">
            {PROVIDERS.map((provider) => {
              const value = getValue(provider.id);
              const isVisible = visibleFields.has(provider.id);

              return (
                <div key={provider.id} className="ui-api-key-field">
                  <div className="ui-api-key-field__header">
                    <label className="ui-api-key-field__label" htmlFor={`api-key-${provider.id}`}>
                      {provider.label}
                    </label>
                  </div>
                  <div className="ui-api-key-field__input-wrap">
                    <input
                      id={`api-key-${provider.id}`}
                      type={isVisible ? "text" : "password"}
                      className="ui-input ui-api-key-field__input"
                      value={value}
                      onChange={(e) => handleChange(provider.id, e.target.value)}
                      placeholder={provider.placeholder}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="ui-api-key-field__toggle"
                      onClick={() => toggleVisibility(provider.id)}
                      title={isVisible ? "Hide key" : "Show key"}
                    >
                      {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  <div className="ui-api-key-field__hint">{provider.hint}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
