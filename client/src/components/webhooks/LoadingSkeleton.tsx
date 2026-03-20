// client/src/components/webhooks/LoadingSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border p-4 space-y-2"
        >
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}
