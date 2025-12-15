import { useEffect, useState } from "react";
import {
  Button,
  DashboardShell,
  Modal,
  SecondarySidebar,
  Sidebar,
  type SecondarySidebarSectionId,
  type SidebarItemId,
} from "../components";
import { AgentsView, ApiKeysView } from "./dashboard";
import { useAuth } from "../auth";
import { useNavigate } from "react-router-dom";
import {
  createAgent,
  createProject,
  createTemplate,
  deleteAgent,
  deleteTemplate,
  duplicateAgent,
  duplicateTemplate,
  deleteAllUserData,
  subscribeProjects,
  subscribeTemplates,
  subscribeAgents,
} from "../lib/db";
import { formatFirestoreError } from "../lib/firestoreError";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeItemId, setActiveItemId] = useState<SidebarItemId>("overview");
  const [activeSubItemId, setActiveSubItemId] = useState<string | undefined>(undefined);

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
  const [createModal, setCreateModal] = useState<null | { kind: "project" | "agent" | "template" }>(null);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<null | { kind: "agent" | "template"; id: string; name: string }>(null);
  const [deleting, setDeleting] = useState(false);

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
    return () => {
      unsubAgents();
      unsubTemplates();
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
            onSelectItemId={(id) => {
              setActiveItemId(id);
              setActiveSubItemId(undefined);
            }}
            signedInAs={user?.displayName ?? user?.email ?? "Signed in"}
            onLogout={async () => {
              await signOut();
              navigate("/");
            }}
            onResetData={
              user
                ? () => {
                    setResetError(null);
                    setResetOpen(true);
                  }
                : undefined
            }
          />
        }
        secondaryOpen={secondaryOpen}
        secondarySidebar={
          <SecondarySidebar
            sectionId={computedSectionId ?? lastSecondarySectionId}
            open={secondaryOpen}
            activeSubItemId={activeSubItemId}
            onSelectSubItemId={setActiveSubItemId}
            agents={agents.map((a) => ({ id: a.id, label: a.name }))}
            templates={templates.map((t) => ({ id: t.id, label: t.name }))}
            onCreateAgent={() => {
              setCreateName("");
              setCreateModal({ kind: "agent" });
            }}
            onCreateTemplate={() => {
              setCreateName("");
              setCreateModal({ kind: "template" });
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
            onCreateAgent={() => {
              setCreateName("");
              setCreateModal({ kind: "agent" });
            }}
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
        open={resetOpen}
        title="Reset data"
        description="Deletes all your projects, agents, and templates in Firestore."
        onClose={() => {
          if (resetting) return;
          setResetOpen(false);
        }}
        footer={
          <div className="ui-modal__actions">
            <Button type="button" variant="secondary" onClick={() => setResetOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!user) return;
                setResetting(true);
                setResetError(null);
                try {
                  await deleteAllUserData(user.uid);
                  setDbError(null);
                  setProjects([]);
                  setAgents([]);
                  setTemplates([]);
                  setSelectedProjectId("");
                  window.localStorage.removeItem(`selectedProjectId:${user.uid}`);
                  setResetOpen(false);
                } catch (err) {
                  const msg = formatFirestoreError(err);
                  setDbError(msg);
                  setResetError(msg);
                } finally {
                  setResetting(false);
                }
              }}
              disabled={resetting}
            >
              {resetting ? "Deleting…" : "Delete everything"}
            </Button>
          </div>
        }
      >
        {resetError ? <div className="ui-inline-error">{resetError}</div> : null}
        <div className="ui-modal__field">
          <div className="ui-modal__field-label">This cannot be undone.</div>
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
