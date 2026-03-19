// src/pages/SearchPage.tsx
import { useEffect, useRef, useState } from "react";
import { useJobSearch } from "@/hooks/useJobSearch";
import { useSearchFilters } from "@/hooks/useSearchFilters";
import { useResumeScoring } from "@/hooks/useResumeScoring";
import SearchBar from "@/components/SearchBar";
import FilterPanel from "@/components/FilterPanel";
import JobList from "@/components/JobList";
import JobDetailPanel from "@/components/JobDetailPanel";
import ResumeUploader from "@/components/ResumeUploader";

export default function SearchPage() {
  const { filters, setFilters } = useSearchFilters();
  const { data, isLoading, isPlaceholderData } = useJobSearch(filters);
  const scoring = useResumeScoring();

  const [resumeText, setResumeText] = useState<string | undefined>(undefined);

  // Tracks the last set of hit IDs we scored — prevents redundant scoreJobs calls
  const lastScoredHitsRef = useRef<string>("");

  useEffect(() => {
    const hits = data?.hits;
    if (!hits || hits.length === 0 || !scoring.hasResume) return;

    const hitsKey = hits.map((h) => h.id).join(",");
    if (hitsKey === lastScoredHitsRef.current) return;
    lastScoredHitsRef.current = hitsKey;

    scoring.scoreJobs(hits);
    // scoring.scoreJobs is stable (useCallback []). scoring.hasResume and
    // data?.hits are the real dependencies that should trigger re-scoring.
  }, [data?.hits, scoring.hasResume, scoring.scoreJobs]);

  const handleResumeText = (text: string) => {
    setResumeText(text);
    // Reset so the useEffect above sees the new hasResume → true transition
    lastScoredHitsRef.current = "";
    scoring.loadResume(text);
  };

  const handleClearResume = () => {
    setResumeText(undefined);
    lastScoredHitsRef.current = "";
    // Resets hasResume, scores, and status in the hook
    scoring.clearResume();
  };

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
        <SearchBar
          filters={filters}
          setFilters={setFilters}
        />
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
    </div>
  );
}
