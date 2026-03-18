import { useQuery } from "@tanstack/react-query";
import { searchJobs, type JobSearchParams } from "@/lib/api";

export function useJobSearch(params: JobSearchParams) {
  return useQuery({
    queryKey: ["jobs", "search", params],
    queryFn: () => searchJobs(params),
    placeholderData: (prev) => prev,
  });
}