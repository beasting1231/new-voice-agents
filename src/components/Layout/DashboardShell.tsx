import type { ReactNode } from "react";

export type DashboardShellProps = {
  sidebar: ReactNode;
  secondarySidebar?: ReactNode;
  secondaryOpen?: boolean;
  children: ReactNode;
};

export function DashboardShell({ sidebar, secondarySidebar, secondaryOpen = false, children }: DashboardShellProps) {
  return (
    <div className={["ui-dashboard-shell", secondaryOpen ? "is-secondary-open" : ""].filter(Boolean).join(" ")}>
      <aside className="ui-dashboard-shell__sidebar">{sidebar}</aside>
      <div className="ui-dashboard-shell__secondary-wrap" aria-hidden={!secondaryOpen}>
        <aside className="ui-dashboard-shell__secondary">{secondarySidebar}</aside>
      </div>
      <main className="ui-dashboard-shell__content">{children}</main>
    </div>
  );
}
