export type FirestoreErrorLike = {
  code?: unknown;
  message?: unknown;
};

export function firestoreErrorCode(err: unknown): string | null {
  const code = (err as FirestoreErrorLike | null)?.code;
  return typeof code === "string" ? code : null;
}

export function isFirestoreEnvironmentError(err: unknown): boolean {
  const code = firestoreErrorCode(err);
  return code === "permission-denied" || code === "failed-precondition" || code === "unauthenticated";
}

export function formatFirestoreError(err: unknown): string {
  const code = firestoreErrorCode(err);
  const message = (err as FirestoreErrorLike | null)?.message;
  const suffix = typeof message === "string" ? ` (${message})` : "";

  if (code === "permission-denied") return `Firestore blocked the request: missing/insufficient permissions${suffix}`;
  if (code === "unauthenticated") return `Firestore blocked the request: not signed in${suffix}`;
  if (code === "failed-precondition") return `Firestore blocked the request: missing index or invalid query${suffix}`;
  return `Firestore error${suffix}`;
}

