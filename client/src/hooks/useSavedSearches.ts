import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
  type CreateSavedSearchInput,
} from "@/lib/api";

export const SAVED_SEARCHES_KEY = ["saved-searches"] as const;

export function useSavedSearches() {
  return useQuery({
    queryKey: SAVED_SEARCHES_KEY,
    queryFn: listSavedSearches,
    retry: (failureCount, error) => {
      if ((error as Error).message.startsWith("Unauthorized")) return false;
      return failureCount < 1;
    },
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavedSearchInput) => createSavedSearch(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_KEY });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedSearch(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVED_SEARCHES_KEY });
    },
  });
}
