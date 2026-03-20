import { useState } from "react";
import {
  Trash2,
  Clock,
  ChevronDown,
  ChevronRight,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDeleteWebhook,
  useToggleWebhook,
  useTestWebhook,
} from "@/hooks/useWebhooks";
import { timeAgo } from "@/lib/utils";
import { DeliveryLog } from "./DeliveryLog";
import type { WebhookSubscription } from "@/types/api.interfaces";

export interface SubscriptionCardProps {
  subscription: WebhookSubscription;
  savedSearchName: string | undefined;
}

export function SubscriptionCard({
  subscription,
  savedSearchName,
}: SubscriptionCardProps) {
  const [showLog, setShowLog] = useState(false);

  const deleteMutation = useDeleteWebhook();
  const toggleMutation = useToggleWebhook();
  const testMutation = useTestWebhook();

  const handleToggle = () => {
    void toggleMutation.mutate({
      id: subscription.id,
      active: !subscription.active,
    });
  };

  const handleTest = () => {
    void testMutation.mutate(subscription.id);
  };

  const handleDelete = () => {
    void deleteMutation.mutate(subscription.id);
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Main row */}
      <div className="flex items-start gap-4 p-4">
        <div className="min-w-0 flex-1 space-y-0.5">
          {/* URL */}
          <p className="truncate text-sm font-medium text-foreground">
            {subscription.url}
          </p>
          {/* Saved search name */}
          <p className="text-xs text-muted-foreground">
            {savedSearchName ? (
              <>
                Watching{" "}
                <span className="font-medium text-foreground">
                  {savedSearchName}
                </span>
              </>
            ) : (
              "Saved search deleted"
            )}
          </p>
          {/* Meta */}
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Added {timeAgo(subscription.createdAt)}
          </p>
        </div>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Active toggle */}
          <button
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              subscription.active
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            aria-label={
              subscription.active ? "Pause webhook" : "Resume webhook"
            }
          >
            {subscription.active ? "Active" : "Paused"}
          </button>

          {/* Test */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            disabled={testMutation.isPending}
            onClick={handleTest}
            title="Send test delivery"
          >
            <FlaskConical className="size-4" />
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
            aria-label="Delete webhook"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Test result feedback */}
      {testMutation.data && (
        <div className="border-t border-border px-4 py-2">
          <p
            className={`text-xs ${testMutation.data.success ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
          >
            {testMutation.data.success
              ? `Test delivered — ${testMutation.data.responseStatus}`
              : `Test failed — ${testMutation.data.error ?? testMutation.data.responseStatus}`}
          </p>
        </div>
      )}

      {/* Delivery log toggle */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowLog((v) => !v)}
          className="flex w-full items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showLog ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
          Delivery log
        </button>

        {showLog && (
          <div className="px-4 pb-4">
            <DeliveryLog subscriptionId={subscription.id} />
          </div>
        )}
      </div>
    </div>
  );
}
