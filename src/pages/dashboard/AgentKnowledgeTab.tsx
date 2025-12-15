import { useEffect, useRef, useState } from "react";
import {
  subscribeKnowledgeDocuments,
  addKnowledgeDocument,
  deleteKnowledgeDocument,
} from "../../lib/db";
import type { KnowledgeDocument, Agent } from "../../lib/db";
import { formatFirestoreError } from "../../lib/firestoreError";

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export type AgentKnowledgeTabProps = {
  agent: Agent;
  projectId: string;
};

async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Handle text files
  if (fileType === "text/plain" || fileName.endsWith(".txt")) {
    return await file.text();
  }

  // Handle PDF files
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    // Use pdf.js to extract text
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import("pdfjs-dist");

    // Import the worker using Vite's ?url syntax
    const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText.trim();
  }

  // Handle markdown files
  if (fileType === "text/markdown" || fileName.endsWith(".md")) {
    return await file.text();
  }

  // Handle JSON files
  if (fileType === "application/json" || fileName.endsWith(".json")) {
    return await file.text();
  }

  // Handle CSV files
  if (fileType === "text/csv" || fileName.endsWith(".csv")) {
    return await file.text();
  }

  throw new Error(`Unsupported file type: ${fileType || file.name}`);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AgentKnowledgeTab({ agent, projectId }: AgentKnowledgeTabProps) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeKnowledgeDocuments(
      agent.id,
      (docs) => setDocuments(docs),
      (err) => setError(formatFirestoreError(err)),
    );
    return () => unsub();
  }, [agent.id]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      try {
        const content = await extractTextFromFile(file);
        await addKnowledgeDocument(
          agent.id,
          projectId,
          file.name,
          file.type || "unknown",
          file.size,
          content,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload file");
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteKnowledgeDocument(docId);
    } catch (err) {
      setError(formatFirestoreError(err));
    }
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return "";
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === "object" && "toDate" in timestamp) {
      date = (timestamp as { toDate: () => Date }).toDate();
    } else {
      return "";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="ui-knowledge-tab">
      {error && <div className="ui-testing-error">{error}</div>}

      <div
        className={`ui-knowledge-upload ${dragActive ? "is-drag-active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.json,.csv,text/plain,application/pdf,text/markdown,application/json,text/csv"
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: "none" }}
        />
        <div className="ui-knowledge-upload__icon">
          <UploadIcon />
        </div>
        <div className="ui-knowledge-upload__text">
          {uploading ? (
            "Uploading..."
          ) : (
            <>
              <strong>Click to upload</strong> or drag and drop
            </>
          )}
        </div>
        <div className="ui-knowledge-upload__hint">
          PDF, TXT, MD, JSON, or CSV files
        </div>
      </div>

      <div className="ui-knowledge-docs">
        <div className="ui-knowledge-docs__header">
          <span>Documents ({documents.length})</span>
        </div>

        {documents.length === 0 ? (
          <div className="ui-knowledge-docs__empty">
            No documents uploaded yet. Upload files to build your agent's knowledge base.
          </div>
        ) : (
          <div className="ui-knowledge-docs__list">
            {documents.map((doc) => (
              <div key={doc.id} className="ui-knowledge-doc">
                <div className="ui-knowledge-doc__icon">
                  <FileIcon />
                </div>
                <div className="ui-knowledge-doc__info">
                  <div className="ui-knowledge-doc__name">{doc.fileName}</div>
                  <div className="ui-knowledge-doc__meta">
                    {formatFileSize(doc.fileSize)} • {formatDate(doc.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  className="ui-knowledge-doc__delete"
                  onClick={() => handleDelete(doc.id)}
                  title="Delete document"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
