// client/src/components/webhooks/EmptyState.tsx
import { Webhook } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Webhook className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">No webhooks yet</p>
        <p className="text-sm text-muted-foreground">
          Add a webhook endpoint to receive notifications when new jobs match
          your saved searches.
        </p>
      </div>
    </div>
  );
}
