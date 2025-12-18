import { useState, useMemo } from "react";
import { Button, Field, SelectMenu, type SelectMenuItem } from "../../components";

export type NotificationToolConfigProps = {
  onSave?: (config: NotificationToolConfiguration) => void;
  onCancel?: () => void;
  initialConfig?: NotificationToolConfiguration;
};

export type NotificationChannel = "sms" | "email";

export type NotificationToolConfiguration = {
  name: string;
  channel: NotificationChannel;
};

export function NotificationToolConfig({ onSave, onCancel, initialConfig }: NotificationToolConfigProps) {
  const [name, setName] = useState(initialConfig?.name ?? "");
  const [channel, setChannel] = useState<NotificationChannel>(initialConfig?.channel ?? "sms");
  const [error, setError] = useState<string | null>(null);

  const channelItems: SelectMenuItem[] = useMemo(
    () => [
      { id: "sms", label: "SMS (Twilio)" },
      { id: "email", label: "Email (SendGrid)" },
    ],
    [],
  );

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please enter a name for this tool");
      return;
    }

    onSave?.({
      name: name.trim(),
      channel,
    });
  };

  return (
    <div className="ui-page">
      <div className="ui-panel">
        <div className="ui-panel__top">
          <div className="ui-panel__title-block">
            <div className="ui-panel__kicker">New Tool</div>
            <div className="ui-panel__title-row">
              <div className="ui-panel__title">Send Notification</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              Save Tool
            </Button>
          </div>
        </div>

        <div className="ui-panel__body">
          <div className="ui-form">
            <Field label="Tool Name" hint="A friendly name for this notification tool">
              <input
                className="ui-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Customer Notifications"
              />
            </Field>

            <Field label="Notification Channel" hint="Select how notifications will be sent">
              <SelectMenu
                className="ui-select-menu--compact"
                label="Channel"
                showLabel={false}
                items={channelItems}
                valueId={channel}
                onChangeValueId={(id) => setChannel(id as NotificationChannel)}
              />
            </Field>

            <div className="ui-notification-info">
              <div className="ui-notification-info__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 7v6M12 16v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="ui-notification-info__content">
                <div className="ui-notification-info__title">API Keys Required</div>
                <div className="ui-notification-info__text">
                  {channel === "sms"
                    ? "Make sure you have configured your Twilio API keys in the API Keys section before using this tool."
                    : "Make sure you have configured your SendGrid API key in the API Keys section before using this tool."}
                </div>
              </div>
            </div>

            {error && <div className="ui-inline-error">{error}</div>}

            <div className="ui-notification-preview">
              <div className="ui-notification-preview__title">Tool Capabilities</div>
              <div className="ui-notification-preview__list">
                {channel === "sms" ? (
                  <div className="ui-notification-preview__item">
                    <span className="ui-notification-preview__check">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span><strong>send_sms</strong> - Send SMS to a phone number with a custom message</span>
                  </div>
                ) : (
                  <div className="ui-notification-preview__item">
                    <span className="ui-notification-preview__check">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span><strong>send_email</strong> - Send email with subject and body to a recipient</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
