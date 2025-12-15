import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "dashed";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const base = "ui-button";
  const variants: Record<ButtonVariant, string> = {
    primary: "ui-button--primary",
    secondary: "ui-button--secondary",
    dashed: "ui-button--dashed",
  };

  return <button className={[base, variants[variant], className].filter(Boolean).join(" ")} {...props} />;
}
