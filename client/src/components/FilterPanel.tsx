// src/components/FilterPanel.tsx
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import type { SearchFilters } from "@/hooks/useSearchFilter";

interface Props {
  filters: SearchFilters;
  setFilters: (update: Partial<SearchFilters>) => void;
}

const SALARY_MAX = 300_000;
const SALARY_STEP = 5_000;
const DEBOUNCE_MS = 400;

export default function FilterPanel({ filters, setFilters }: Props) {
  const [localLocation, setLocalLocation] = useState(filters.location ?? "");
  const [localSalary, setLocalSalary] = useState(filters.salary_min ?? 0);

  // Keep local state in sync with URL (back/forward nav)
  useEffect(() => {
    setLocalLocation(filters.location ?? "");
  }, [filters.location]);
  useEffect(() => {
    setLocalSalary(filters.salary_min ?? 0);
  }, [filters.salary_min]);

  // Debounce location → URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = filters.location ?? "";
      if (localLocation !== current) {
        setFilters({ location: localLocation || undefined, page: 1 });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [localLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce salary → URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = filters.salary_min ?? 0;
      if (localSalary !== current) {
        setFilters({ salary_min: localSalary || undefined, page: 1 });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [localSalary]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-foreground">Filters</p>

      {/* Location */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Location
        </label>
        <Input
          placeholder="e.g. London, Remote"
          value={localLocation}
          onChange={(e) => setLocalLocation(e.target.value)}
        />
      </div>

      <Separator />

      {/* Remote */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="remote-toggle"
          className="text-sm text-foreground cursor-pointer select-none"
        >
          Remote only
        </label>
        <input
          id="remote-toggle"
          type="checkbox"
          checked={filters.remote ?? false}
          onChange={(e) =>
            setFilters({ remote: e.target.checked || undefined, page: 1 })
          }
          className="size-4 cursor-pointer accent-primary"
        />
      </div>

      <Separator />

      {/* Salary min */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Min salary
          </label>
          <span className="text-sm font-medium text-foreground">
            {localSalary > 0 ? `$${(localSalary / 1000).toFixed(0)}k` : "Any"}
          </span>
        </div>
        <Slider
          min={0}
          max={SALARY_MAX}
          step={SALARY_STEP}
          value={[localSalary]}
          onValueChange={([val]) => setLocalSalary(val!)}
        />
      </div>

      <Separator />

      {/* Sort */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Sort by
        </label>
        <select
          value={filters.sort}
          onChange={(e) =>
            setFilters({
              sort: e.target.value as SearchFilters["sort"],
              page: 1,
            })
          }
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="relevance">Relevance</option>
          <option value="date">Date posted</option>
          <option value="salary">Salary</option>
        </select>
      </div>

      {/* Clear all */}
      {(filters.location ||
        filters.remote ||
        filters.salary_min ||
        filters.sort !== "relevance") && (
        <>
          <Separator />
          <button
            onClick={() =>
              setFilters({
                location: undefined,
                remote: undefined,
                salary_min: undefined,
                sort: "relevance",
                page: 1,
              })
            }
            className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear all filters
          </button>
        </>
      )}
    </div>
  );
}
