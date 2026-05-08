import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "./useDebounce";

export function useMedicinesSearch(query: string) {
  const debouncedQuery = useDebounce(query, 200);

  return useQuery({
    queryKey: ["medicines", "search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return [];
      }
      const response = await api.searchMedicines(debouncedQuery);
      return response.data;
    },
    enabled: true,
  });
}
