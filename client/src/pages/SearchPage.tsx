import { useEffect, useRef, useState } from "react";
import { Bookmark, MapPin } from "lucide-react";
import { useJobSearch } from "@/hooks/useJobSearch";
import { useSearchFilters } from "@/hooks/useSearchFilters";
import { useResumeScoring } from "@/hooks/useResumeScoring";
import SearchBar from "@/components/SearchBar";
import FilterPanel from "@/components/FilterPanel";
import JobList from "@/components/JobList";
import JobDetailPanel from "@/components/JobDetailPanel";
import ResumeUploader from "@/components/ResumeUploader";
import SaveSearchModal from "@/components/SaveSearchModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

const EXP_LABELS: Record<string, string> = {
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead / Staff",
};

const SOURCE_LABELS: Record<string, string> = {
  remotive: "Remotive",
  hn: "HN Who's Hiring",
  arbeitnow: "Arbeitnow",
  themuse: "The Muse",
  adzuna: "Adzuna",
};

export default function SearchPage() {
  const { filters, setFilters } = useSearchFilters();
  const { data, isLoading, isPlaceholderData } = useJobSearch(filters);
  const scoring = useResumeScoring();

  const [resumeText, setResumeText] = useState<string | undefined>(undefined);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const lastScoredHitsRef = useRef<string>("");

  useEffect(() => {
    const hits = data?.hits;
    if (!hits || hits.length === 0 || !scoring.hasResume) return;

    const hitsKey = hits.map((h) => h.id).join(",");
    if (hitsKey === lastScoredHitsRef.current) return;
    lastScoredHitsRef.current = hitsKey;

    scoring.scoreJobs(hits);
  }, [data?.hits, scoring.hasResume, scoring.scoreJobs]);

  const handleResumeText = (text: string) => {
    setResumeText(text);
    lastScoredHitsRef.current = "";
    scoring.loadResume(text);
  };

  const handleClearResume = () => {
    setResumeText(undefined);
    lastScoredHitsRef.current = "";
    scoring.clearResume();
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
    <div className="flex gap-6 p-6">
      <aside className="w-64 shrink-0 space-y-4">
        <ResumeUploader
          status={scoring.status}
          hasResume={scoring.hasResume}
          isModelReady={scoring.isModelReady}
          errorMessage={scoring.errorMessage}
          onResumeText={handleResumeText}
          onClear={handleClearResume}
        />
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
        />
      </aside>

      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchBar
              filters={filters}
              setFilters={setFilters}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setShowSaveModal(true)}
            title="Save this search"
          >
            <Bookmark className="size-4" />
            Save
          </Button>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5">
            {filters.location && (
              <Badge
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                <MapPin className="size-3" />
                {filters.location}
                <button
                  onClick={() => setFilters({ location: undefined, page: 1 })}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label="Remove location filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.remote && (
              <Badge
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                Remote
                <button
                  onClick={() => setFilters({ remote: undefined, page: 1 })}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label="Remove remote filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.salary_min && (
              <Badge
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                ${(filters.salary_min / 1000).toFixed(0)}k+
                <button
                  onClick={() => setFilters({ salary_min: undefined, page: 1 })}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label="Remove salary filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.sort !== "relevance" && (
              <Badge
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                Sort: {filters.sort === "date" ? "Date" : "Salary"}
                <button
                  onClick={() => setFilters({ sort: "relevance", page: 1 })}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label="Remove sort filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.job_type && (
              <Badge
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {JOB_TYPE_LABELS[filters.job_type]}
                <button
                  onClick={() => setFilters({ job_type: undefined, page: 1 })}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label="Remove job type filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.experience_level && (
              <Badge
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {EXP_LABELS[filters.experience_level]}
                <button
                  onClick={() =>
                    setFilters({ experience_level: undefined, page: 1 })
                  }
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label="Remove experience filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {(filters.skills ?? []).map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {s}
                <button
                  onClick={() =>
                    setFilters({
                      skills: filters.skills?.filter((x) => x !== s),
                      page: 1,
                    })
                  }
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label={`Remove ${s} skill filter`}
                >
                  ×
                </button>
              </Badge>
            ))}
            {filters.source && (
              <Badge
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {SOURCE_LABELS[filters.source]}
                <button
                  onClick={() => setFilters({ source: undefined, page: 1 })}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label="Remove source filter"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}

        {data && (
          <p className="text-sm text-muted-foreground">
            {data.total} jobs found
          </p>
        )}
        <JobList
          hits={data?.hits ?? []}
          total={data?.total ?? 0}
          isLoading={isLoading || isPlaceholderData}
          onSelectJob={(id) => setFilters({ jobId: id })}
          scores={scoring.hasResume ? scoring.scores : undefined}
        />
      </div>

      <JobDetailPanel
        jobId={filters.jobId ?? null}
        onClose={() => setFilters({ jobId: undefined })}
        matchScore={
          filters.jobId ? scoring.scores.get(filters.jobId) : undefined
        }
        resumeText={resumeText}
      />

      {showSaveModal && (
        <SaveSearchModal
          filters={filters}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
