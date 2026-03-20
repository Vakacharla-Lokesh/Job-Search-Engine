// client/src/components/saved-searches/UnauthenticatedState.tsx
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function UnauthenticatedState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <p className="font-medium text-foreground">
        Sign in to view saved searches
      </p>
      <p className="text-sm text-muted-foreground">
        You need to be logged in to save and manage searches.
      </p>
      <Button
        asChild
        size="sm"
      >
        <Link to="/auth/login">Sign in</Link>
      </Button>
    </div>
  );
}
