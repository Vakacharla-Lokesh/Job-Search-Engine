// src/components/SaveSearchModal.tsx
// Triggered from SearchPage. Captures a name for the current search filters
// and POSTs to /saved-searches.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateSavedSearch } from "@/hooks/useSavedSearches";
import type { SearchFilters } from "@/hooks/useSearchFilters";

interface Props {
  filters: SearchFilters;
  onClose: () => void;
}

export default function SaveSearchModal({ filters, onClose }: Props) {
  const [name, setName] = useState(filters.q || "My search");
  const createMutation = useCreateSavedSearch();

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        query: filters.q ?? "",
        filters: {
          location: filters.location ? [filters.location] : [],
          salary_min: filters.salary_min ?? null,
          remote: filters.remote ?? null,
        },
      });
      onClose();
    } catch {
      // error surfaced via createMutation.error below
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      {/* Panel — stop propagation so clicking inside doesn't close */}
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-semibold text-foreground">Save this search</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Give it a name. You&apos;ll get a webhook notification when new
          matching jobs are found.
        </p>

        <Input
          autoFocus
          placeholder="e.g. Senior React Remote"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
            if (e.key === "Escape") onClose();
          }}
        />

        {createMutation.error && (
          <p className="mt-2 text-sm text-destructive">
            {createMutation.error instanceof Error
              ? createMutation.error.message === "Unauthorized"
                ? "You must be signed in to save searches."
                : createMutation.error.message
              : "Something went wrong."}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!name.trim() || createMutation.isPending}
            onClick={() => void handleSave()}
          >
            {createMutation.isPending ? "Saving…" : "Save search"}
          </Button>
        </div>
      </div>
    </div>
  );
}
