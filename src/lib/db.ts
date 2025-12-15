import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";

function createdAtMs(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "object") {
    const maybeToMillis = (value as { toMillis?: () => unknown }).toMillis?.();
    if (typeof maybeToMillis === "number") return maybeToMillis;
    const seconds = (value as { seconds?: unknown }).seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  return 0;
}

export type Project = {
  id: string;
  name: string;
  ownerUid: string;
  createdAt?: unknown;
};

export type Agent = {
  id: string;
  projectId: string;
  name: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  mode?: "text" | "voice";
  voiceId?: string;
  llmProviderId?: string;
  llmModelId?: string;
  agentSpeaksFirst?: boolean;
  firstMessage?: string;
  systemPrompt?: string;
  timeZoneId?: string;
};

export type Template = {
  id: string;
  projectId: string;
  name: string;
  createdAt?: unknown;
};

export type ApiKeys = {
  id: string;
  projectId: string;
  openai?: string;
  anthropic?: string;
  elevenlabs?: string;
  google?: string;
  deepgram?: string;
  updatedAt?: unknown;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolType?: "knowledge_search" | "knowledge_found" | "thinking" | "complete";
  createdAt?: unknown;
};

export type ChatSession = {
  id: string;
  agentId: string;
  projectId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type KnowledgeDocument = {
  id: string;
  agentId: string;
  projectId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  content: string;
  createdAt?: unknown;
};

export function subscribeProjects(
  uid: string,
  cb: (projects: Project[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const q = query(collection(firebaseDb, "projects"), where("ownerUid", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const projects = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) }))
        .sort((a, b) => createdAtMs(a.createdAt) - createdAtMs(b.createdAt) || a.name.localeCompare(b.name));
      cb(projects);
    },
    (err) => onError?.(err),
  );
}

export async function createProject(uid: string, name: string) {
  const projectDoc = await addDoc(collection(firebaseDb, "projects"), {
    name,
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return projectDoc.id;
}

async function deleteCollectionWhere(
  collectionName: "agents" | "templates",
  field: "projectId",
  value: string,
): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await getDocs(query(collection(firebaseDb, collectionName), where(field, "==", value), limit(500)));
    if (snap.empty) break;
    const batch = writeBatch(firebaseDb);
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
    deleted += snap.size;
  }
  return deleted;
}

export async function deleteAllUserData(uid: string) {
  // Delete all projects owned by the user, plus their dependent agents/templates.
  while (true) {
    const projectsSnap = await getDocs(query(collection(firebaseDb, "projects"), where("ownerUid", "==", uid), limit(100)));
    if (projectsSnap.empty) break;

    for (const project of projectsSnap.docs) {
      await Promise.all([
        deleteCollectionWhere("agents", "projectId", project.id),
        deleteCollectionWhere("templates", "projectId", project.id),
      ]);
      const batch = writeBatch(firebaseDb);
      batch.delete(project.ref);
      await batch.commit();
    }
  }
}

export function subscribeAgents(
  projectId: string,
  cb: (agents: Agent[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const q = query(collection(firebaseDb, "agents"), where("projectId", "==", projectId));
  return onSnapshot(
    q,
    (snap) => {
      const agents = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Agent, "id">) }))
        .sort((a, b) => createdAtMs(a.createdAt) - createdAtMs(b.createdAt) || a.name.localeCompare(b.name));
      cb(agents);
    },
    (err) => onError?.(err),
  );
}

export function subscribeTemplates(
  projectId: string,
  cb: (templates: Template[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const q = query(collection(firebaseDb, "templates"), where("projectId", "==", projectId));
  return onSnapshot(
    q,
    (snap) => {
      const templates = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Template, "id">) }))
        .sort((a, b) => createdAtMs(a.createdAt) - createdAtMs(b.createdAt) || a.name.localeCompare(b.name));
      cb(templates);
    },
    (err) => onError?.(err),
  );
}

export function subscribeAgent(
  agentId: string,
  cb: (agent: Agent | null) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firebaseDb, "agents", agentId),
    (snap) => {
      if (!snap.exists()) cb(null);
      else cb({ id: snap.id, ...(snap.data() as Omit<Agent, "id">) });
    },
    (err) => onError?.(err),
  );
}

export async function createAgent(projectId: string, name: string) {
  const agentDoc = await addDoc(collection(firebaseDb, "agents"), {
    projectId,
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    mode: "voice",
    voiceId: "alloy",
    agentSpeaksFirst: false,
    systemPrompt: "",
    timeZoneId: "nyc",
  });
  return agentDoc.id;
}

export async function createTemplate(projectId: string, name: string) {
  const templateDoc = await addDoc(collection(firebaseDb, "templates"), {
    projectId,
    name,
    createdAt: serverTimestamp(),
  });
  return templateDoc.id;
}

export async function updateAgent(agentId: string, patch: Partial<Omit<Agent, "id" | "projectId" | "createdAt">>) {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) cleaned[k] = v;
  }
  await updateDoc(doc(firebaseDb, "agents", agentId), { ...cleaned, updatedAt: serverTimestamp() });
}

export async function deleteAgent(agentId: string) {
  await deleteDoc(doc(firebaseDb, "agents", agentId));
}

export async function deleteTemplate(templateId: string) {
  await deleteDoc(doc(firebaseDb, "templates", templateId));
}

export async function duplicateAgent(agentId: string) {
  const snap = await getDoc(doc(firebaseDb, "agents", agentId));
  if (!snap.exists()) throw new Error("Agent not found");
  const data = snap.data();
  const newDoc = await addDoc(collection(firebaseDb, "agents"), {
    ...data,
    name: `${data.name} (copy)`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newDoc.id;
}

export async function duplicateTemplate(templateId: string) {
  const snap = await getDoc(doc(firebaseDb, "templates", templateId));
  if (!snap.exists()) throw new Error("Template not found");
  const data = snap.data();
  const newDoc = await addDoc(collection(firebaseDb, "templates"), {
    ...data,
    name: `${data.name} (copy)`,
    createdAt: serverTimestamp(),
  });
  return newDoc.id;
}

export function subscribeApiKeys(
  projectId: string,
  cb: (apiKeys: ApiKeys | null) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firebaseDb, "apiKeys", projectId),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
      } else {
        cb({ id: snap.id, ...(snap.data() as Omit<ApiKeys, "id">) });
      }
    },
    (err) => onError?.(err),
  );
}

export async function updateApiKeys(
  projectId: string,
  keys: Partial<Omit<ApiKeys, "id" | "projectId" | "updatedAt">>,
) {
  const docRef = doc(firebaseDb, "apiKeys", projectId);
  await setDoc(docRef, {
    ...keys,
    projectId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function createChatSession(agentId: string, projectId: string) {
  const sessionDoc = await addDoc(collection(firebaseDb, "chatSessions"), {
    agentId,
    projectId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return sessionDoc.id;
}

export function subscribeChatSessions(
  agentId: string,
  cb: (sessions: ChatSession[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(firebaseDb, "chatSessions"),
    where("agentId", "==", agentId),
  );
  return onSnapshot(
    q,
    (snap) => {
      const sessions = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ChatSession, "id">) }))
        .sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
      cb(sessions);
    },
    (err) => onError?.(err),
  );
}

export function subscribeChatMessages(
  sessionId: string,
  cb: (messages: ChatMessage[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(firebaseDb, "chatMessages"),
    where("sessionId", "==", sessionId),
  );
  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }))
        .sort((a, b) => createdAtMs(a.createdAt) - createdAtMs(b.createdAt));
      cb(messages);
    },
    (err) => onError?.(err),
  );
}

export async function addChatMessage(
  sessionId: string,
  role: "user" | "assistant" | "tool",
  content: string,
  toolType?: "knowledge_search" | "knowledge_found" | "thinking" | "complete",
) {
  const messageData: Record<string, unknown> = {
    sessionId,
    role,
    content,
    createdAt: serverTimestamp(),
  };
  if (toolType) {
    messageData.toolType = toolType;
  }
  const messageDoc = await addDoc(collection(firebaseDb, "chatMessages"), messageData);
  await updateDoc(doc(firebaseDb, "chatSessions", sessionId), {
    updatedAt: serverTimestamp(),
  });
  return messageDoc.id;
}

export async function getApiKeys(projectId: string): Promise<ApiKeys | null> {
  const snap = await getDoc(doc(firebaseDb, "apiKeys", projectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<ApiKeys, "id">) };
}

export function subscribeKnowledgeDocuments(
  agentId: string,
  cb: (docs: KnowledgeDocument[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(firebaseDb, "knowledgeDocuments"),
    where("agentId", "==", agentId),
  );
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<KnowledgeDocument, "id">) }))
        .sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
      cb(docs);
    },
    (err) => onError?.(err),
  );
}

export async function addKnowledgeDocument(
  agentId: string,
  projectId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  content: string,
) {
  const docRef = await addDoc(collection(firebaseDb, "knowledgeDocuments"), {
    agentId,
    projectId,
    fileName,
    fileType,
    fileSize,
    content,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteKnowledgeDocument(docId: string) {
  await deleteDoc(doc(firebaseDb, "knowledgeDocuments", docId));
}

export async function getKnowledgeDocuments(agentId: string): Promise<KnowledgeDocument[]> {
  const q = query(
    collection(firebaseDb, "knowledgeDocuments"),
    where("agentId", "==", agentId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<KnowledgeDocument, "id">) }));
}
