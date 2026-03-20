// client/src/components/FilterPanel.tsx
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { SearchFilters } from "@/hooks/useSearchFilters";

interface Props {
  filters: SearchFilters;
  setFilters: (update: Partial<SearchFilters>) => void;
}

const SALARY_MAX = 300_000;
const SALARY_STEP = 5_000;
const DEBOUNCE_MS = 400;

const selectClass =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export default function FilterPanel({ filters, setFilters }: Props) {
  const [localLocation, setLocalLocation] = useState(filters.location ?? "");
  const [localSalary, setLocalSalary] = useState(filters.salary_min ?? 0);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    setLocalLocation(filters.location ?? "");
  }, [filters.location]);

  useEffect(() => {
    setLocalSalary(filters.salary_min ?? 0);
  }, [filters.salary_min]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = filters.location ?? "";
      if (localLocation !== current) {
        setFilters({ location: localLocation || undefined, page: 1 });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [localLocation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = filters.salary_min ?? 0;
      if (localSalary !== current) {
        setFilters({ salary_min: localSalary || undefined, page: 1 });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [localSalary]);

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = skillInput.trim().toLowerCase();
      if (!trimmed) return;
      const current = filters.skills ?? [];
      if (!current.includes(trimmed)) {
        setFilters({ skills: [...current, trimmed], page: 1 });
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    const next = (filters.skills ?? []).filter((s) => s !== skill);
    setFilters({ skills: next.length > 0 ? next : undefined, page: 1 });
  };

  const hasActiveFilters =
    !!filters.location ||
    filters.remote ||
    !!filters.salary_min ||
    filters.sort !== "relevance" ||
    !!filters.job_type ||
    !!filters.experience_level ||
    (filters.skills && filters.skills.length > 0) ||
    !!filters.source;

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
          className={selectClass}
        >
          <option value="relevance">Relevance</option>
          <option value="date">Date posted</option>
          <option value="salary">Salary</option>
        </select>
      </div>

      <Separator />

      {/* Job Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Job type
        </label>
        <select
          value={filters.job_type ?? ""}
          onChange={(e) =>
            setFilters({
              job_type:
                (e.target.value as SearchFilters["job_type"]) || undefined,
              page: 1,
            })
          }
          className={selectClass}
        >
          <option value="">Any</option>
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </select>
      </div>

      <Separator />

      {/* Experience Level */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Experience level
        </label>
        <select
          value={filters.experience_level ?? ""}
          onChange={(e) =>
            setFilters({
              experience_level:
                (e.target.value as SearchFilters["experience_level"]) ||
                undefined,
              page: 1,
            })
          }
          className={selectClass}
        >
          <option value="">Any</option>
          <option value="entry">Entry level</option>
          <option value="mid">Mid level</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead / Staff</option>
        </select>
      </div>

      <Separator />

      {/* Skills */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Skills
        </label>
        {(filters.skills ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {(filters.skills ?? []).map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {s}
                <button
                  onClick={() => removeSkill(s)}
                  className="ml-0.5 opacity-60 hover:opacity-100 leading-none"
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Input
          placeholder="e.g. React, TypeScript"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={handleSkillKeyDown}
        />
        <p className="text-xs text-muted-foreground">
          Press Enter or comma to add
        </p>
      </div>

      <Separator />

      {/* Source */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Source
        </label>
        <select
          value={filters.source ?? ""}
          onChange={(e) =>
            setFilters({
              source: (e.target.value as SearchFilters["source"]) || undefined,
              page: 1,
            })
          }
          className={selectClass}
        >
          <option value="">Any</option>
          <option value="remotive">Remotive</option>
          <option value="hn">HN Who's Hiring</option>
          <option value="arbeitnow">Arbeitnow</option>
          <option value="themuse">The Muse</option>
          <option value="adzuna">Adzuna</option>
        </select>
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <>
          <Separator />
          <button
            onClick={() =>
              setFilters({
                location: undefined,
                remote: undefined,
                salary_min: undefined,
                sort: "relevance",
                job_type: undefined,
                experience_level: undefined,
                skills: undefined,
                source: undefined,
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
