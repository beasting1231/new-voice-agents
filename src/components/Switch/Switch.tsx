export type SwitchProps = {
  checked: boolean;
  onChangeChecked: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function Switch({ checked, onChangeChecked, label, disabled }: SwitchProps) {
  return (
    <label className={["ui-switch", disabled ? "is-disabled" : ""].filter(Boolean).join(" ")}>
      <span className="ui-switch__control">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChangeChecked(e.target.checked)}
        />
        <span className="ui-switch__track" aria-hidden="true">
          <span className="ui-switch__thumb" aria-hidden="true" />
        </span>
      </span>
      <span className="ui-switch__label">{label}</span>
    </label>
  );
}

