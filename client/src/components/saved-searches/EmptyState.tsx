import { Search } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Search className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">No saved searches yet</p>
        <p className="text-sm text-muted-foreground">
          Save a search from the search page to get notified when new matching
          jobs are posted.
        </p>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
      >
        <Link to="/search">Go to search</Link>
      </Button>
    </div>
  );
}
