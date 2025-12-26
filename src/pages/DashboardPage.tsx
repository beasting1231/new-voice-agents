import { useEffect, useState, useCallback } from "react";
import {
  Button,
  DashboardShell,
  Modal,
  SecondarySidebar,
  Sidebar,
  type MobileView,
  type SecondarySidebarSectionId,
  type SidebarItemId,
} from "../components";
import { AgentsView, ApiKeysView, ToolsView } from "./dashboard";
import { useAuth } from "../auth";
import { useNavigate } from "react-router-dom";
import {
  createAgent,
  createProject,
  createTemplate,
  createTool,
  deleteAgent,
  deleteTemplate,
  duplicateAgent,
  duplicateTemplate,
  subscribeProjects,
  subscribeTemplates,
  subscribeAgents,
  subscribeTools,
  type Tool,
} from "../lib/db";
import { formatFirestoreError } from "../lib/firestoreError";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeItemId, setActiveItemId] = useState<SidebarItemId>("overview");
  const [activeSubItemId, setActiveSubItemId] = useState<string | undefined>(undefined);
  const [mobileView, setMobileView] = useState<MobileView>("sidebar");

  const secondaryOpen = activeItemId !== "overview" && activeItemId !== "apiKeys";
  const computedSectionId = secondaryOpen ? (activeItemId as SecondarySidebarSectionId) : undefined;
  const [lastSecondarySectionId, setLastSecondarySectionId] = useState<SecondarySidebarSectionId>("agents");

  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    if (computedSectionId) setLastSecondarySectionId(computedSectionId);
  }, [computedSectionId]);

  useEffect(() => {
    if (!user) return;
    let unsub: (() => void) | null = null;
    (async () => {
      unsub = subscribeProjects(
        user.uid,
        (next) => {
          setDbError(null);
          setProjects(next.map((p) => ({ id: p.id, name: p.name })));
        },
        (err) => setDbError(formatFirestoreError(err)),
      );
    })();
    return () => unsub?.();
  }, [user]);

  useEffect(() => {
    const key = user ? `selectedProjectId:${user.uid}` : null;
    if (!key) return;

    const stored = window.localStorage.getItem(key);
    if (!selectedProjectId && stored) setSelectedProjectId(stored);
  }, [selectedProjectId, user]);

  useEffect(() => {
    if (!user) return;
    const key = `selectedProjectId:${user.uid}`;
    if (selectedProjectId) window.localStorage.setItem(key, selectedProjectId);
  }, [selectedProjectId, user]);

  useEffect(() => {
    if (!projects.length) return;
    if (selectedProjectId && projects.some((p) => p.id === selectedProjectId)) return;
    setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [createModal, setCreateModal] = useState<null | { kind: "project" | "agent" | "template" | "tool" }>(null);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<null | { kind: "agent" | "template"; id: string; name: string }>(null);
  const [deleting, setDeleting] = useState(false);

  // Items that have a secondary sidebar
  const hasSecondarySidebar = (itemId: SidebarItemId) =>
    itemId !== "overview" && itemId !== "apiKeys";

  // Get the display title for mobile header
  const getMobileTitle = useCallback(() => {
    if (mobileView === "sidebar") return "BS Voice Agents";
    if (mobileView === "secondary") {
      const titles: Record<SidebarItemId, string> = {
        overview: "Overview",
        agents: "Agents",
        tools: "Tools",
        phoneNumbers: "Phone Numbers",
        apiKeys: "API Keys",
        integrations: "Integrations",
      };
      return titles[activeItemId] || "BS Voice Agents";
    }
    // For content view, show the selected sub-item name or section name
    if (activeSubItemId) {
      const agent = agents.find(a => a.id === activeSubItemId);
      if (agent) return agent.name;
      const tool = tools.find(t => t.id === activeSubItemId);
      if (tool) return tool.name;
    }
    return "Details";
  }, [mobileView, activeItemId, activeSubItemId, agents, tools]);

  // Handle mobile back navigation
  const handleMobileBack = useCallback(() => {
    if (mobileView === "content") {
      // Go back to secondary if it exists, otherwise to sidebar
      if (hasSecondarySidebar(activeItemId)) {
        setMobileView("secondary");
      } else {
        setMobileView("sidebar");
      }
    } else if (mobileView === "secondary") {
      setMobileView("sidebar");
    }
  }, [mobileView, activeItemId]);

  // Handle sidebar item selection for mobile
  const handleSidebarItemSelect = useCallback((itemId: SidebarItemId) => {
    setActiveItemId(itemId);
    setActiveSubItemId(undefined);
    // On mobile, navigate to secondary or content based on whether item has secondary
    if (hasSecondarySidebar(itemId)) {
      setMobileView("secondary");
    } else {
      setMobileView("content");
    }
  }, []);

  // Handle secondary sidebar item selection for mobile
  const handleSecondaryItemSelect = useCallback((subItemId: string) => {
    setActiveSubItemId(subItemId);
    setMobileView("content");
  }, []);

  useEffect(() => {
    setCreateError(null);
  }, [createModal]);

  useEffect(() => {
    if (!user) return;
    if (!selectedProjectId) return;
    const unsubAgents = subscribeAgents(
      selectedProjectId,
      (next) => {
        setDbError(null);
        setAgents(next.map((a) => ({ id: a.id, name: a.name })));
      },
      (err) => setDbError(formatFirestoreError(err)),
    );
    const unsubTemplates = subscribeTemplates(
      selectedProjectId,
      (next) => {
        setDbError(null);
        setTemplates(next.map((t) => ({ id: t.id, name: t.name })));
      },
      (err) => setDbError(formatFirestoreError(err)),
    );
    const unsubTools = subscribeTools(
      selectedProjectId,
      (next) => {
        setDbError(null);
        setTools(next);
      },
      (err) => setDbError(formatFirestoreError(err)),
    );
    return () => {
      unsubAgents();
      unsubTemplates();
      unsubTools();
    };
  }, [selectedProjectId, user]);

  useEffect(() => {
    if (activeItemId !== "agents") return;
    if (activeSubItemId) return;
    if (agents.length) setActiveSubItemId(agents[0].id);
  }, [activeItemId, activeSubItemId, agents]);

  return (
    <>
      <DashboardShell
        sidebar={
          <Sidebar
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProjectId={setSelectedProjectId}
            onNewProject={
              user
                ? () => {
                    setCreateName("");
                    setCreateModal({ kind: "project" });
                  }
                : undefined
            }
            activeItemId={activeItemId}
            onSelectItemId={handleSidebarItemSelect}
            signedInAs={user?.displayName ?? user?.email ?? "Signed in"}
            onLogout={async () => {
              await signOut();
              navigate("/");
            }}
          />
        }
        secondaryOpen={secondaryOpen}
        mobileView={mobileView}
        mobileTitle={getMobileTitle()}
        onMobileBack={handleMobileBack}
        secondarySidebar={
          <SecondarySidebar
            sectionId={computedSectionId ?? lastSecondarySectionId}
            open={secondaryOpen}
            activeSubItemId={activeSubItemId}
            onSelectSubItemId={handleSecondaryItemSelect}
            agents={agents.map((a) => ({ id: a.id, label: a.name }))}
            templates={templates.map((t) => ({ id: t.id, label: t.name }))}
            tools={tools.map((t) => ({ id: t.id, label: t.name }))}
            onCreateAgent={() => {
              setCreateName("");
              setCreateModal({ kind: "agent" });
            }}
            onCreateTemplate={() => {
              setCreateName("");
              setCreateModal({ kind: "template" });
            }}
            onCreateTool={() => {
              // Clear selection to show tool type cards
              setActiveSubItemId(undefined);
            }}
            onDuplicateAgent={async (id) => {
              try {
                const newId = await duplicateAgent(id);
                setActiveSubItemId(newId);
              } catch (err) {
                setDbError(formatFirestoreError(err));
              }
            }}
            onDeleteAgent={(id) => {
              const agent = agents.find((a) => a.id === id);
              setDeleteConfirm({ kind: "agent", id, name: agent?.name ?? "this agent" });
            }}
            onDuplicateTemplate={async (id) => {
              try {
                const newId = await duplicateTemplate(id);
                setActiveSubItemId(newId);
              } catch (err) {
                setDbError(formatFirestoreError(err));
              }
            }}
            onDeleteTemplate={(id) => {
              const template = templates.find((t) => t.id === id);
              setDeleteConfirm({ kind: "template", id, name: template?.name ?? "this template" });
            }}
          />
        }
      >
        {dbError ? (
          <div className="ui-dashboard-content">
            <div className="ui-dashboard-content__empty">{dbError}</div>
          </div>
        ) : null}

        {activeItemId === "agents" ? (
          <AgentsView
            selectedProjectId={selectedProjectId}
            selectedSubItemId={activeSubItemId}
            agentCount={agents.length}
            tools={tools}
            onCreateAgent={() => {
              setCreateName("");
              setCreateModal({ kind: "agent" });
            }}
          />
        ) : activeItemId === "tools" ? (
          <ToolsView
            selectedProjectId={selectedProjectId}
            selectedSubItemId={activeSubItemId}
            toolCount={tools.length}
            tools={tools}
            onSaveN8nTool={async (config) => {
              try {
                const toolId = await createTool(selectedProjectId, config.name, "n8n", {
                  serverUrl: config.serverUrl,
                  availableTools: config.availableTools,
                });
                setActiveSubItemId(toolId);
              } catch (err) {
                setDbError(formatFirestoreError(err));
              }
            }}
            onSaveNotificationTool={async (config) => {
              try {
                const toolId = await createTool(selectedProjectId, config.name, "notification", {
                  notificationChannel: config.channel,
                });
                setActiveSubItemId(toolId);
              } catch (err) {
                setDbError(formatFirestoreError(err));
              }
            }}
            onToolDeleted={() => setActiveSubItemId(undefined)}
          />
        ) : activeItemId === "apiKeys" ? (
          <ApiKeysView selectedProjectId={selectedProjectId} />
        ) : (
          <div className="ui-dashboard-content">
            <div className="ui-dashboard-content__empty">Dashboard content goes here (we'll build this together).</div>
          </div>
        )}
      </DashboardShell>

      <Modal
        open={Boolean(createModal)}
        title={
          createModal?.kind === "project"
            ? "Create project"
            : createModal?.kind === "template"
              ? "Create template"
              : createModal?.kind === "tool"
                ? "Create tool"
                : "Create agent"
        }
        description="Enter a name to create it in the database."
        onClose={() => {
          if (creating) return;
          setCreateModal(null);
        }}
        footer={
          <div className="ui-modal__actions">
            <Button type="button" variant="secondary" onClick={() => setCreateModal(null)} disabled={creating}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!user) {
                  setCreateError("Sign in to create items.");
                  return;
                }
                if (!createModal) return;
                const trimmed = createName.trim();
                if (!trimmed) return;
                setCreating(true);
                try {
                  try {
                    const id = await (async () => {
                      if (createModal.kind === "project") return createProject(user.uid, trimmed);
                      if (!selectedProjectId) throw new Error("No project selected");
                      return createModal.kind === "agent"
                        ? createAgent(selectedProjectId, trimmed)
                        : createTemplate(selectedProjectId, trimmed);
                    })();
                    setDbError(null);
                    setCreateError(null);
                    if (createModal.kind === "project") setSelectedProjectId(id);
                    else setActiveSubItemId(id);
                    setCreateModal(null);
                  } catch (err) {
                    const msg = formatFirestoreError(err);
                    setDbError(msg);
                    setCreateError(msg);
                  }
                } finally {
                  setCreating(false);
                }
              }}
              disabled={!user || creating || !createName.trim()}
            >
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
        }
      >
        <div className="ui-modal__field">
          <div className="ui-modal__field-label">Name</div>
          <input
            className="ui-input"
            value={createName}
            onChange={(e) => {
              setCreateName(e.target.value);
              setCreateError(null);
            }}
            placeholder={
              createModal?.kind === "project"
                ? "e.g. Basting Solutions LLC"
                : createModal?.kind === "template"
                  ? "e.g. Transfer template"
                  : createModal?.kind === "tool"
                    ? "e.g. Search database"
                    : "e.g. transfer agent"
            }
            autoFocus
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const trimmed = createName.trim();
              if (!trimmed) return;
              (async () => {
                if (!user) {
                  setCreateError("Sign in to create items.");
                  return;
                }
                if (!createModal) return;
                setCreating(true);
                try {
                  try {
                    const id = await (async () => {
                      if (createModal.kind === "project") return createProject(user.uid, trimmed);
                      if (!selectedProjectId) throw new Error("No project selected");
                      return createModal.kind === "agent"
                        ? createAgent(selectedProjectId, trimmed)
                        : createTemplate(selectedProjectId, trimmed);
                    })();
                    setDbError(null);
                    setCreateError(null);
                    if (createModal.kind === "project") setSelectedProjectId(id);
                    else setActiveSubItemId(id);
                    setCreateModal(null);
                  } catch (err) {
                    const msg = formatFirestoreError(err);
                    setDbError(msg);
                    setCreateError(msg);
                  }
                } finally {
                  setCreating(false);
                }
              })();
            }}
          />
          {createError ? <div className="ui-inline-error">{createError}</div> : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteConfirm)}
        title={`Delete ${deleteConfirm?.kind ?? "item"}`}
        description={`Are you sure you want to delete "${deleteConfirm?.name}"?`}
        onClose={() => {
          if (deleting) return;
          setDeleteConfirm(null);
        }}
        footer={
          <div className="ui-modal__actions">
            <Button type="button" variant="secondary" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!deleteConfirm) return;
                setDeleting(true);
                try {
                  if (deleteConfirm.kind === "agent") {
                    await deleteAgent(deleteConfirm.id);
                  } else {
                    await deleteTemplate(deleteConfirm.id);
                  }
                  if (activeSubItemId === deleteConfirm.id) setActiveSubItemId(undefined);
                  setDeleteConfirm(null);
                } catch (err) {
                  setDbError(formatFirestoreError(err));
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        }
      >
        <div className="ui-modal__field">
          <div className="ui-modal__field-label">This cannot be undone.</div>
        </div>
      </Modal>
    </>
  );
}
