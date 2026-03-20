// src/components/JobList.tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { JobDocument } from "@/types/job.interfaces";
import JobCard from "@/components/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchX } from "lucide-react";

type Job = Omit<JobDocument, "embedding">;

interface Props {
  hits: Job[];
  total: number;
  isLoading: boolean;
  onSelectJob: (id: string) => void;
  scores?: Map<string, number>; // undefined = no resume loaded
}

function JobCardSkeleton() {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export default function JobList({
  hits,
  total,
  isLoading,
  onSelectJob,
  scores,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: hits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
    gap: 8,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <SearchX className="size-10 opacity-40" />
        <p className="text-sm">No jobs found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-220px)] overflow-y-auto pr-1"
    >
      <div
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        className="relative w-full"
      >
        {virtualizer.getVirtualItems().map((vItem) => {
          const job = hits[vItem.index]!;
          return (
            <div
              key={vItem.key}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              style={{ transform: `translateY(${vItem.start}px)` }}
              className="absolute top-0 left-0 w-full"
            >
              <JobCard
                job={job}
                onSelect={() => onSelectJob(job.id)}
                matchScore={scores?.get(job.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
