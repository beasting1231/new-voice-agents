import type { PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="ui-app-shell">
      <main className="ui-app-shell__main">{children}</main>
    </div>
  );
}
