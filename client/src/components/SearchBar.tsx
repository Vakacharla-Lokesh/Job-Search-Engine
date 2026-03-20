import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { SearchFilters } from "@/hooks/useSearchFilters";

interface Props {
  filters: SearchFilters;
  setFilters: (update: Partial<SearchFilters>) => void;
}

const DEBOUNCE_MS = 300;

export default function SearchBar({ filters, setFilters }: Props) {
  const [localValue, setLocalValue] = useState(filters.q);

  useEffect(() => {
    setLocalValue(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== filters.q) {
        setFilters({ q: localValue, page: 1 });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [localValue]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        placeholder="Search jobs, skills, companies…"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-9 h-10 text-base"
      />
    </div>
  );
}
