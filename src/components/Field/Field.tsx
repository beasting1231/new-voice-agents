import type { PropsWithChildren, ReactNode } from "react";

export type FieldProps = PropsWithChildren<{
  label: string;
  hint?: string;
  right?: ReactNode;
}>;

export function Field({ label, hint, right, children }: FieldProps) {
  return (
    <div className="ui-field">
      <div className="ui-field__row">
        <div className="ui-field__labels">
          <div className="ui-field__label">{label}</div>
          {hint && <div className="ui-field__hint">{hint}</div>}
        </div>
        {right && <div className="ui-field__right">{right}</div>}
      </div>
      <div className="ui-field__control">{children}</div>
    </div>
  );
}

