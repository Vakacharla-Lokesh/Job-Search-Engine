// client/src/pages/SavedSearchesPage.tsx
import { useState } from "react";
import { Link } from "react-router";
import { Trash2, Search, MapPin, DollarSign, Wifi, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useSavedSearches,
  useDeleteSavedSearch,
} from "@/hooks/useSavedSearches";
import type { SavedSearch } from "@/lib/api";

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Search className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">No saved searches yet</p>
        <p className="text-sm text-muted-foreground">
          Save a search from the search page to get notified when new matching
          jobs are posted.
        </p>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
      >
        <Link to="/search">Go to search</Link>
      </Button>
    </div>
  );
}

// ─── Unauthenticated State ─────────────────────────────────────────────────────

function UnauthenticatedState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <p className="font-medium text-foreground">
        Sign in to view saved searches
      </p>
      <p className="text-sm text-muted-foreground">
        You need to be logged in to save and manage searches.
      </p>
      <Button
        asChild
        size="sm"
      >
        <Link to="/auth/login">Sign in</Link>
      </Button>
    </div>
  );
}

// ─── Saved Search Card ─────────────────────────────────────────────────────────

interface CardProps {
  savedSearch: SavedSearch;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function SavedSearchCard({ savedSearch, onDelete, isDeleting }: CardProps) {
  const { filters } = savedSearch;
  const hasFilters =
    filters.location.length > 0 ||
    filters.salary_min !== null ||
    filters.remote !== null;

  // Build the URL that takes the user back to search with these filters applied
  const searchParams = new URLSearchParams();
  if (savedSearch.query) searchParams.set("q", savedSearch.query);
  if (filters.location.length > 0)
    searchParams.set("location", filters.location[0]!);
  if (filters.remote !== null)
    searchParams.set("remote", String(filters.remote));
  if (filters.salary_min !== null)
    searchParams.set("salary_min", String(filters.salary_min));
  const searchUrl = `/search?${searchParams.toString()}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Name + query */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {savedSearch.name}
          </p>
          {savedSearch.query && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              &ldquo;{savedSearch.query}&rdquo;
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link to={searchUrl}>
              <Search className="mr-1.5 size-3.5" />
              Search
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            disabled={isDeleting}
            onClick={() => onDelete(savedSearch.id)}
            aria-label={`Delete saved search "${savedSearch.name}"`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {hasFilters && (
        <>
          <Separator className="my-3" />
          <div className="flex flex-wrap gap-1.5">
            {filters.location.length > 0 &&
              filters.location.map((loc) => (
                <Badge
                  key={loc}
                  variant="secondary"
                  className="gap-1"
                >
                  <MapPin className="size-3" />
                  {loc}
                </Badge>
              ))}
            {filters.remote && (
              <Badge
                variant="secondary"
                className="gap-1"
              >
                <Wifi className="size-3" />
                Remote
              </Badge>
            )}
            {filters.salary_min !== null && (
              <Badge
                variant="secondary"
                className="gap-1"
              >
                <DollarSign className="size-3" />
                {`$${(filters.salary_min / 1000).toFixed(0)}k+`}
              </Badge>
            )}
          </div>
        </>
      )}

      {/* Metadata */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          Saved {timeAgo(savedSearch.createdAt)}
        </span>
        {savedSearch.lastAlertAt && (
          <span>Last alerted {timeAgo(savedSearch.lastAlertAt)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

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
