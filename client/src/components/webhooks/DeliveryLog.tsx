// client/src/components/webhooks/DeliveryLog.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { useWebhookDeliveries } from "@/hooks/useWebhooks";
import { timeAgo } from "@/lib/utils";
import type { WebhookDelivery } from "@/types/api.interfaces";

// ─── Delivery Row ─────────────────────────────────────────────────────────────

interface DeliveryRowProps {
  delivery: WebhookDelivery;
}

function DeliveryRow({ delivery }: DeliveryRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <span
        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          delivery.success
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "bg-destructive/15 text-destructive"
        }`}
      >
        {delivery.success
          ? `${delivery.responseStatus ?? "OK"}`
          : (delivery.error ?? String(delivery.responseStatus ?? "Error"))}
      </span>
      <span className="flex-1 truncate text-muted-foreground">
        job {delivery.jobId}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {timeAgo(delivery.sentAt)}
      </span>
    </div>
  );
}

// ─── Delivery Log ─────────────────────────────────────────────────────────────

export interface DeliveryLogProps {
  subscriptionId: string;
}

export function DeliveryLog({ subscriptionId }: DeliveryLogProps) {
  const { data, isLoading } = useWebhookDeliveries(subscriptionId);

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            className="h-7 w-full"
          />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="pt-2 text-sm text-muted-foreground">
        No deliveries yet. Send a test to verify your endpoint.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {data.map((d) => (
        <DeliveryRow
          key={d.id}
          delivery={d}
        />
      ))}
    </div>
  );
}
