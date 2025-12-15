import type { ButtonHTMLAttributes } from "react";

export type GoogleSignInButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  text?: string;
};

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.1 1.53 7.5 2.8l5.45-5.45C33.9 4.1 29.5 2 24 2 14.85 2 7.1 7.24 3.8 14.8l6.67 5.17C12.2 14.22 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.55c0-1.52-.14-2.98-.39-4.4H24v8.33h12.4c-.54 2.9-2.17 5.36-4.62 7.02l7.07 5.48c4.13-3.82 7.25-9.45 7.25-16.43z"
      />
      <path
        fill="#FBBC05"
        d="M10.47 28.12a14.4 14.4 0 0 1-.76-4.62c0-1.6.28-3.14.76-4.62L3.8 13.7A23.92 23.92 0 0 0 2 23.5c0 3.87.93 7.52 2.57 10.8l5.9-6.18z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.5 0 10.1-1.82 13.47-4.93l-7.07-5.48c-1.96 1.32-4.47 2.1-6.4 2.1-6.4 0-11.8-4.72-13.53-10.97L4.57 33.9C7.86 40.76 14.85 46 24 46z"
      />
      <path fill="none" d="M2 2h44v44H2z" />
    </svg>
  );
}

export function GoogleSignInButton({ text = "Continue with Google", className, ...props }: GoogleSignInButtonProps) {
  return (
    <button type="button" className={["ui-google-button", className].filter(Boolean).join(" ")} {...props}>
      <span className="ui-google-button__icon">
        <GoogleG />
      </span>
      <span className="ui-google-button__text">{text}</span>
    </button>
  );
}

