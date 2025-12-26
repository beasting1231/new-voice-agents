import { Button } from "../Button";
import { ProjectSelect, type ProjectSelectItem } from "../ProjectSelect";

export type SidebarItemId = "overview" | "agents" | "tools" | "phoneNumbers" | "apiKeys" | "integrations";

export type SidebarProject = {
  id: string;
  name: string;
};

export type SidebarProps = {
  projects: SidebarProject[];
  selectedProjectId: string;
  onSelectProjectId: (projectId: string) => void;
  onNewProject?: () => void;
  activeItemId?: SidebarItemId;
  onSelectItemId?: (itemId: SidebarItemId) => void;
  onLogout?: () => void;
  signedInAs?: string;
};

function SidebarHeader({ children }: { children: string }) {
  return <div className="ui-sidebar__header">{children}</div>;
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M8 5.5L12.5 10L8 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SidebarItem({
  id,
  label,
  active,
  onClick,
}: {
  id: SidebarItemId;
  label: string;
  active: boolean;
  onClick?: (id: SidebarItemId) => void;
}) {
  return (
    <button
      type="button"
      className={["ui-sidebar__item", active ? "is-active" : ""].filter(Boolean).join(" ")}
      onClick={() => onClick?.(id)}
    >
      <span className="ui-sidebar__item-label">{label}</span>
      <ChevronRight className="ui-sidebar__item-chevron" />
    </button>
  );
}

export function Sidebar({
  projects,
  selectedProjectId,
  onSelectProjectId,
  onNewProject,
  activeItemId = "overview",
  onSelectItemId,
  onLogout,
  signedInAs = "Peter Basting",
}: SidebarProps) {
  const projectItems: ProjectSelectItem[] = projects;

  return (
    <div className="ui-sidebar">
      <div className="ui-sidebar__logo">
        <img src="/BSLogoBlack.svg" alt="BS Voice Agents" className="ui-sidebar__logo-img" />
      </div>
      <div className="ui-sidebar__top">
        <ProjectSelect
          items={projectItems}
          valueId={selectedProjectId}
          onChangeValueId={onSelectProjectId}
          onNewProject={onNewProject}
        />
      </div>

      <nav className="ui-sidebar__nav" aria-label="Dashboard navigation">
        <SidebarItem id="overview" label="Overview" active={activeItemId === "overview"} onClick={onSelectItemId} />

        <SidebarHeader>Build</SidebarHeader>
        <SidebarItem id="agents" label="Agents" active={activeItemId === "agents"} onClick={onSelectItemId} />
        <SidebarItem id="tools" label="Tools" active={activeItemId === "tools"} onClick={onSelectItemId} />
        <SidebarItem
          id="phoneNumbers"
          label="Phone Numbers"
          active={activeItemId === "phoneNumbers"}
          onClick={onSelectItemId}
        />
        <SidebarItem id="apiKeys" label="API Keys" active={activeItemId === "apiKeys"} onClick={onSelectItemId} />
        <SidebarItem
          id="integrations"
          label="Integrations"
          active={activeItemId === "integrations"}
          onClick={onSelectItemId}
        />
      </nav>

      <div className="ui-sidebar__bottom">
        <div className="ui-sidebar__signed-in">
          <span className="ui-sidebar__signed-in-label">Signed in as</span>
          <span className="ui-sidebar__signed-in-name">{signedInAs}</span>
        </div>
        <Button type="button" variant="dashed" onClick={onLogout} className="ui-sidebar__logout">
          Sign out
        </Button>
      </div>
    </div>
  );
}
