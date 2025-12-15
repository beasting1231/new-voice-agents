import { useEffect, useRef, useState } from "react";
import type { SidebarItemId } from "../Sidebar";
import { ContextMenu } from "../ContextMenu";

export type SecondarySidebarSectionId = Exclude<SidebarItemId, "overview">;

export type SecondarySidebarItem = {
  id: string;
  label: string;
};

export type SecondarySidebarSection = {
  id: SecondarySidebarSectionId;
  title: string;
  items: SecondarySidebarItem[];
};

export type SecondarySidebarProps = {
  sectionId: SecondarySidebarSectionId;
  open?: boolean;
  activeSubItemId?: string;
  onSelectSubItemId?: (id: string) => void;
  agents?: SecondarySidebarItem[];
  templates?: SecondarySidebarItem[];
  onCreateAgent?: () => void;
  onCreateTemplate?: () => void;
  onDuplicateAgent?: (id: string) => void;
  onDeleteAgent?: (id: string) => void;
  onDuplicateTemplate?: (id: string) => void;
  onDeleteTemplate?: (id: string) => void;
};

function getSection(sectionId: SecondarySidebarSectionId): SecondarySidebarSection {
  switch (sectionId) {
    case "agents":
      return { id: sectionId, title: "Agents", items: [{ id: "agents", label: "Agents" }, { id: "templates", label: "Templates" }] };
    case "tools":
      return { id: sectionId, title: "Tools", items: [{ id: "all", label: "All tools" }, { id: "categories", label: "Categories" }] };
    case "phoneNumbers":
      return { id: sectionId, title: "Phone numbers", items: [{ id: "numbers", label: "Numbers" }, { id: "routing", label: "Routing" }] };
    case "apiKeys":
      return { id: sectionId, title: "API keys", items: [{ id: "keys", label: "Keys" }, { id: "permissions", label: "Permissions" }, { id: "audit", label: "Audit log" }] };
    case "integrations":
      return { id: sectionId, title: "Integrations", items: [{ id: "connected", label: "Connected" }, { id: "browse", label: "Browse" }] };
  }
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

export function SecondarySidebar({
  sectionId,
  open = true,
  activeSubItemId,
  onSelectSubItemId,
  agents = [],
  templates = [],
  onCreateAgent,
  onCreateTemplate,
  onDuplicateAgent,
  onDeleteAgent,
  onDuplicateTemplate,
  onDeleteTemplate,
}: SecondarySidebarProps) {
  const [renderedSectionId, setRenderedSectionId] = useState<SecondarySidebarSectionId>(sectionId);
  const [contentVisible, setContentVisible] = useState(true);
  const switchTimeoutRef = useRef<number | null>(null);
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    itemId: string;
    itemType: "agent" | "template";
  }>({ open: false, x: 0, y: 0, itemId: "", itemType: "agent" });

  useEffect(() => {
    if (!open) return;
    if (sectionId === renderedSectionId) return;

    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setContentVisible(false);
    });
    if (switchTimeoutRef.current) window.clearTimeout(switchTimeoutRef.current);

    switchTimeoutRef.current = window.setTimeout(() => {
      setRenderedSectionId(sectionId);
      setContentVisible(true);
      switchTimeoutRef.current = null;
    }, 140);

    return () => {
      cancelled = true;
      if (switchTimeoutRef.current) {
        window.clearTimeout(switchTimeoutRef.current);
        switchTimeoutRef.current = null;
      }
    };
  }, [open, renderedSectionId, sectionId]);

  const section = getSection(renderedSectionId);
  const current = activeSubItemId ?? section.items[0]?.id ?? "";
  const isAgentsSection = renderedSectionId === "agents";

  const agentItems: SecondarySidebarItem[] = agents;
  const templateItems: SecondarySidebarItem[] = templates;

  return (
    <div className={["ui-secondary-sidebar", open ? "is-open" : "is-closed"].join(" ")}>
      <div className={["ui-secondary-sidebar__content", contentVisible ? "is-visible" : "is-hidden"].join(" ")}>
        <div className="ui-secondary-sidebar__title">{section.title}</div>
        <nav className="ui-secondary-sidebar__nav" aria-label={`${section.title} sub navigation`}>
          {isAgentsSection ? (
            <>
              <button
                type="button"
                className={["ui-secondary-sidebar__group", agentsExpanded ? "is-expanded" : ""].join(" ")}
                onClick={() => (open && contentVisible ? setAgentsExpanded((v) => !v) : undefined)}
              >
                <span>Agents</span>
                <ChevronRight className="ui-secondary-sidebar__chevron ui-secondary-sidebar__group-chevron" />
              </button>
              <div className={["ui-secondary-sidebar__sublist", agentsExpanded ? "is-open" : ""].join(" ")}>
                {agentItems.map((item) => {
                  const active = item.id === current;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={["ui-secondary-sidebar__subitem", active ? "is-active" : ""].filter(Boolean).join(" ")}
                      onClick={() => (open && contentVisible ? onSelectSubItemId?.(item.id) : undefined)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ open: true, x: e.clientX, y: e.clientY, itemId: item.id, itemType: "agent" });
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
                {agentsExpanded && (
                  <button
                    type="button"
                    className="ui-secondary-sidebar__create"
                    onClick={() => (open && contentVisible ? onCreateAgent?.() : undefined)}
                  >
                    + New agent
                  </button>
                )}
              </div>

              <button
                type="button"
                className={["ui-secondary-sidebar__group", templatesExpanded ? "is-expanded" : ""].join(" ")}
                onClick={() => (open && contentVisible ? setTemplatesExpanded((v) => !v) : undefined)}
              >
                <span>Templates</span>
                <ChevronRight className="ui-secondary-sidebar__chevron ui-secondary-sidebar__group-chevron" />
              </button>
              <div className={["ui-secondary-sidebar__sublist", templatesExpanded ? "is-open" : ""].join(" ")}>
                {templateItems.map((item) => {
                  const active = item.id === current;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={["ui-secondary-sidebar__subitem", active ? "is-active" : ""].filter(Boolean).join(" ")}
                      onClick={() => (open && contentVisible ? onSelectSubItemId?.(item.id) : undefined)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ open: true, x: e.clientX, y: e.clientY, itemId: item.id, itemType: "template" });
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
                {templatesExpanded && (
                  <button
                    type="button"
                    className="ui-secondary-sidebar__create"
                    onClick={() => (open && contentVisible ? onCreateTemplate?.() : undefined)}
                  >
                    + New template
                  </button>
                )}
              </div>
            </>
          ) : (
            section.items.map((item) => {
              const active = item.id === current;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={["ui-secondary-sidebar__item", active ? "is-active" : ""].filter(Boolean).join(" ")}
                  onClick={() => (open && contentVisible ? onSelectSubItemId?.(item.id) : undefined)}
                >
                  <span>{item.label}</span>
                  <ChevronRight className="ui-secondary-sidebar__chevron" />
                </button>
              );
            })
          )}
        </nav>
      </div>
      <ContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu((prev) => ({ ...prev, open: false }))}
        items={
          contextMenu.itemType === "agent"
            ? [
                { label: "Duplicate", onClick: () => onDuplicateAgent?.(contextMenu.itemId) },
                { label: "Delete", onClick: () => onDeleteAgent?.(contextMenu.itemId), danger: true },
              ]
            : [
                { label: "Duplicate", onClick: () => onDuplicateTemplate?.(contextMenu.itemId) },
                { label: "Delete", onClick: () => onDeleteTemplate?.(contextMenu.itemId), danger: true },
              ]
        }
      />
    </div>
  );
}
