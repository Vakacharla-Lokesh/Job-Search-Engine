// client/src/components/webhooks/SecretModal.tsx
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SecretModalProps {
  secret: string;
  onClose: () => void;
}

/** Shown exactly once after creation. User must copy — it's never shown again. */
export function SecretModal({ secret, onClose }: SecretModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-foreground">
          Copy your webhook secret
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          This secret is shown <strong>once only</strong>. Use it to verify the{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            X-Webhook-Signature
          </code>{" "}
          header on incoming requests.
        </p>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
          <code className="flex-1 break-all text-xs text-foreground select-all">
            {secret}
          </code>
          <button
            onClick={() => void handleCopy()}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Copy secret"
          >
            {copied ? (
              <Check className="size-4 text-emerald-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
