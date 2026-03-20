// src/pages/SearchPage.tsx
import { useEffect, useRef, useState } from "react";
import { Bookmark } from "lucide-react";
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

export default function SearchPage() {
  const { filters, setFilters } = useSearchFilters();
  const { data, isLoading, isPlaceholderData } = useJobSearch(filters);
  const scoring = useResumeScoring();

  const [resumeText, setResumeText] = useState<string | undefined>(undefined);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Tracks the last set of hit IDs we scored — prevents redundant scoreJobs calls
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
