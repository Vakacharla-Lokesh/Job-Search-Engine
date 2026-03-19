// client/src/components/ResumeUploader.tsx
//
// Handles resume input (PDF upload or text paste) and text extraction.
// Extracted text is passed up to the parent via onResumeText().
// PDF parsing runs on the main thread via pdfjs-dist; the worker only
// receives the resulting plain text string.

import { useCallback, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { FileText, UploadCloud, X, Loader2, AlertCircle } from "lucide-react";
import type { WorkerStatus } from "@/hooks/useResumeScoring";

// Must be set before any getDocument() call
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface Props {
  status: WorkerStatus;
  hasResume: boolean;
  isModelReady: boolean;
  errorMessage: string | null;
  onResumeText: (text: string) => void;
  onClear: () => void;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n");
}

export type { WorkerStatus };

export default function ResumeUploader({
  status,
  hasResume,
  isModelReady,
  errorMessage,
  onResumeText,
  onClear,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isBusy = status === "embedding" || status === "scoring";

  const handleFile = useCallback(
    async (file: File) => {
      setParseError(null);

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setParseError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }

      try {
        let text: string;

        if (file.type === "application/pdf") {
          text = await extractTextFromPdf(file);
        } else if (file.type === "text/plain") {
          text = await file.text();
        } else {
          setParseError("Only PDF and .txt files are supported.");
          return;
        }

        const trimmed = text.trim();
        if (trimmed.length < 50) {
          setParseError(
            "Could not extract enough text from this file. Try pasting your resume instead.",
          );
          return;
        }

        setFileName(file.name);
        onResumeText(trimmed);
      } catch {
        setParseError("Failed to read file. Try pasting your resume instead.");
      }
    },
    [onResumeText],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      // Reset so re-uploading same file triggers onChange
      e.target.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleClear = useCallback(() => {
    setFileName(null);
    setParseError(null);
    onClear();
  }, [onClear]);

  const displayError = parseError ?? errorMessage;

  // ── Loaded state ──────────────────────────────────────────────────────────
  if (hasResume && fileName) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {isBusy ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
            ) : (
              <FileText className="size-4 shrink-0 text-primary" />
            )}
            <span className="truncate text-sm font-medium text-foreground">
              {fileName}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {isBusy ? "Scoring…" : "Resume active"}
            </span>
          </div>
          <button
            onClick={handleClear}
            disabled={isBusy}
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            aria-label="Remove resume"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ── Upload state ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={!isModelReady || isBusy}
        className={[
          "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/60 hover:bg-muted/40",
          !isModelReady || isBusy
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer",
        ].join(" ")}
      >
        {!isModelReady ? (
          <>
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Loading AI model…
            </span>
          </>
        ) : (
          <>
            <UploadCloud className="size-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Upload resume</span>{" "}
              or drag & drop
            </span>
            <span className="text-xs text-muted-foreground">
              PDF or TXT · max {MAX_FILE_SIZE_MB}MB
            </span>
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,text/plain,application/pdf"
        className="sr-only"
        onChange={handleInputChange}
      />

      {displayError && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
