import type { ReactNode } from "react";

export type MobileView = "sidebar" | "secondary" | "content";

export type DashboardShellProps = {
  sidebar: ReactNode;
  secondarySidebar?: ReactNode;
  secondaryOpen?: boolean;
  children: ReactNode;
  mobileView?: MobileView;
  onMobileBack?: () => void;
};

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function DashboardShell({
  sidebar,
  secondarySidebar,
  secondaryOpen = false,
  children,
  mobileView = "sidebar",
  onMobileBack,
}: DashboardShellProps) {
  const showBackButton = mobileView !== "sidebar";

  const classNames = [
    "ui-dashboard-shell",
    secondaryOpen ? "is-secondary-open" : "",
    `mobile-${mobileView}`,
  ].filter(Boolean).join(" ");

  const headerClassNames = [
    "ui-mobile-header",
    showBackButton ? "is-visible" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <header className={headerClassNames}>
        {showBackButton && onMobileBack ? (
          <button className="ui-mobile-header__back" onClick={onMobileBack} aria-label="Go back">
            <BackIcon />
          </button>
        ) : null}
      </header>
      <div className={classNames}>
        <aside className="ui-dashboard-shell__sidebar">{sidebar}</aside>
        <div className="ui-dashboard-shell__secondary-wrap" aria-hidden={!secondaryOpen}>
          <aside className="ui-dashboard-shell__secondary">{secondarySidebar}</aside>
        </div>
        <main className="ui-dashboard-shell__content">{children}</main>
      </div>
    </>
  );
}
