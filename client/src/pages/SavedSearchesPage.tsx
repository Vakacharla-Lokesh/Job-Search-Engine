// client/src/pages/SavedSearchesPage.tsx
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  useSavedSearches,
  useDeleteSavedSearch,
} from "@/hooks/useSavedSearches";
import { SavedSearchCard } from "@/components/saved-searches/SavedSearchCard";
import { EmptyState } from "@/components/saved-searches/EmptyState";
import { UnauthenticatedState } from "@/components/saved-searches/UnauthenticatedState";
import { LoadingSkeleton } from "@/components/saved-searches/LoadingSkeleton";

export default function SavedSearchesPage() {
  const { data, isLoading, error } = useSavedSearches();
  const deleteMutation = useDeleteSavedSearch();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isUnauthorized =
    error instanceof Error && error.message === "Unauthorized";

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Saved Searches
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ll be notified via webhook when new jobs match these
            searches.
          </p>
        </div>
        {data && data.length > 0 && (
          <Badge variant="secondary">{data.length}</Badge>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isUnauthorized ? (
        <UnauthenticatedState />
      ) : error ? (
        <p className="text-sm text-destructive">
          Failed to load saved searches. Please try again.
        </p>
      ) : !data || data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <SavedSearchCard
              key={s.id}
              savedSearch={s}
              onDelete={handleDelete}
              isDeleting={deletingId === s.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
