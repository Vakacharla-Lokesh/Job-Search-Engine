// client/src/components/webhooks/CreateWebhookForm.tsx
import { useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateWebhook } from "@/hooks/useWebhooks";
import { useSavedSearches } from "@/hooks/useSavedSearches";

export interface CreateWebhookFormProps {
  onCreated: (secret: string) => void;
}

export function CreateWebhookForm({ onCreated }: CreateWebhookFormProps) {
  const [open, setOpen] = useState(false);
  const [savedSearchId, setSavedSearchId] = useState("");
  const [url, setUrl] = useState("");

  const { data: savedSearches } = useSavedSearches();
  const createMutation = useCreateWebhook();

  const handleSubmit = async () => {
    if (!savedSearchId || !url.trim()) return;
    try {
      const result = await createMutation.mutateAsync({
        savedSearchId,
        url: url.trim(),
      });
      setOpen(false);
      setSavedSearchId("");
      setUrl("");
      if (result.secret) onCreated(result.secret);
    } catch {
      // error surfaced via createMutation.error below
    }
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add webhook
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">New webhook</p>

      {/* Saved search selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Saved search
        </label>
        <select
          value={savedSearchId}
          onChange={(e) => setSavedSearchId(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="">Select a saved search…</option>
          {savedSearches?.map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.name}
            </option>
          ))}
        </select>
        {(!savedSearches || savedSearches.length === 0) && (
          <p className="text-xs text-muted-foreground">
            No saved searches yet.{" "}
            <Link
              to="/saved-searches"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Create one first.
            </Link>
          </p>
        )}
      </div>

      {/* Endpoint URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Endpoint URL
        </label>
        <Input
          placeholder="https://hooks.slack.com/services/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSubmit();
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </div>

      {createMutation.error && (
        <p className="text-sm text-destructive">
          {(createMutation.error as Error).message}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!savedSearchId || !url.trim() || createMutation.isPending}
          onClick={() => void handleSubmit()}
        >
          {createMutation.isPending ? "Creating…" : "Create"}
        </Button>
      </div>
    </div>
  );
}
