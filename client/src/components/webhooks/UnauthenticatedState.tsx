import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function UnauthenticatedState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <p className="font-medium text-foreground">Sign in to manage webhooks</p>
      <Button
        asChild
        size="sm"
      >
        <Link to="/auth/login">Sign in</Link>
      </Button>
    </div>
  );
}
