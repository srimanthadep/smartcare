import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "./useDebounce";

export function usePatientsSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ["patients", "search", debouncedQuery],
    queryFn: () => api.getPatients({ search: debouncedQuery }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60000,
  });
}
