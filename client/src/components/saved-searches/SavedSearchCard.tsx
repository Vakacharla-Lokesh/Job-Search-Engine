// client/src/components/saved-searches/SavedSearchCard.tsx
import { Link } from "react-router";
import { Trash2, Search, MapPin, DollarSign, Wifi, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { timeAgo } from "@/lib/utils";
import type { SavedSearch } from "@/types/api.interfaces";

export interface SavedSearchCardProps {
  savedSearch: SavedSearch;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function SavedSearchCard({
  savedSearch,
  onDelete,
  isDeleting,
}: SavedSearchCardProps) {
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
