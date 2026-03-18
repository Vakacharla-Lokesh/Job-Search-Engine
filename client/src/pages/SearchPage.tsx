import { useJobSearch } from "@/hooks/useJobSearch";
import { useSearchFilters } from "@/hooks/useSearchFilters";
import SearchBar from "@/components/SearchBar";
import FilterPanel from "@/components/FilterPanel";
import JobList from "@/components/JobList";
import JobDetailPanel from "@/components/JobDetailPanel";

export default function SearchPage() {
  const { filters, setFilters } = useSearchFilters();
  const { data, isLoading, isPlaceholderData } = useJobSearch(filters);

  return (
    <div className="flex gap-6 p-6">
      <aside className="w-64 shrink-0">
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
        />
      </div>
      <JobDetailPanel
        jobId={filters.jobId ?? null}
        onClose={() => setFilters({ jobId: undefined })}
      />
    </div>
  );
}
