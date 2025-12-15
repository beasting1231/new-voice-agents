import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
};

export function IconButton({ icon, label, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={["ui-icon-button", className].filter(Boolean).join(" ")}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
}

