// client/src/pages/WebhookSettingsPage.tsx
import { useState } from "react";
import { Link } from "react-router";
import {
  Trash2,
  Webhook,
  Clock,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Plus,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  useWebhooks,
  useWebhookDeliveries,
  useCreateWebhook,
  useDeleteWebhook,
  useToggleWebhook,
  useTestWebhook,
} from "@/hooks/useWebhooks";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import type { WebhookSubscription, WebhookDelivery } from "@/lib/api";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) {
    const hours = Math.floor(diff / 3_600_000);
    if (hours === 0) {
      const mins = Math.floor(diff / 60_000);
      return mins <= 1 ? "just now" : `${mins}m ago`;
    }
    return `${hours}h ago`;
  }
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Secret Reveal Modal ───────────────────────────────────────────────────────
// Shown exactly once after creation. User must copy — it's never shown again.

interface SecretModalProps {
  secret: string;
  onClose: () => void;
}

function SecretModal({ secret, onClose }: SecretModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-foreground">
          Copy your webhook secret
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          This secret is shown <strong>once only</strong>. Use it to verify the{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            X-Webhook-Signature
          </code>{" "}
          header on incoming requests.
        </p>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
          <code className="flex-1 break-all text-xs text-foreground select-all">
            {secret}
          </code>
          <button
            onClick={() => void handleCopy()}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Copy secret"
          >
            {copied ? (
              <Check className="size-4 text-emerald-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Webhook Form ───────────────────────────────────────────────────────

interface CreateFormProps {
  onCreated: (secret: string) => void;
}

function CreateWebhookForm({ onCreated }: CreateFormProps) {
  const [open, setOpen] = useState(false);
  const [savedSearchId, setSavedSearchId] = useState("");
  const [url, setUrl] = useState("");

  const { data: savedSearches } = useSavedSearches();
  const createMutation = useCreateWebhook();

  const handleSubmit = async () => {
    if (!savedSearchId || !url.trim()) return;
    try {
      const result = await createMutation.mutateAsync({
        savedSearchId,
        url: url.trim(),
      });
      setOpen(false);
      setSavedSearchId("");
      setUrl("");
      if (result.secret) onCreated(result.secret);
    } catch {
      // error surfaced via createMutation.error below
    }
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add webhook
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">New webhook</p>

      {/* Saved search selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Saved search
        </label>
        <select
          value={savedSearchId}
          onChange={(e) => setSavedSearchId(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="">Select a saved search…</option>
          {savedSearches?.map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.name}
            </option>
          ))}
        </select>
        {(!savedSearches || savedSearches.length === 0) && (
          <p className="text-xs text-muted-foreground">
            No saved searches yet.{" "}
            <Link
              to="/saved-searches"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Create one first.
            </Link>
          </p>
        )}
      </div>

      {/* Endpoint URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Endpoint URL
        </label>
        <Input
          placeholder="https://hooks.slack.com/services/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSubmit();
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </div>

      {createMutation.error && (
        <p className="text-sm text-destructive">
          {(createMutation.error as Error).message}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!savedSearchId || !url.trim() || createMutation.isPending}
          onClick={() => void handleSubmit()}
        >
          {createMutation.isPending ? "Creating…" : "Create"}
        </Button>
      </div>
    </div>
  );
}

// ─── Delivery Log ──────────────────────────────────────────────────────────────

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
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

interface DeliveryLogProps {
  subscriptionId: string;
}

function DeliveryLog({ subscriptionId }: DeliveryLogProps) {
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

// ─── Subscription Card ─────────────────────────────────────────────────────────

interface SubscriptionCardProps {
  subscription: WebhookSubscription;
  savedSearchName: string | undefined;
}

function SubscriptionCard({
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

// ─── Empty / Unauth States ─────────────────────────────────────────────────────

function EmptyState() {
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

function UnauthenticatedState() {
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

function LoadingSkeleton() {
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function WebhookSettingsPage() {
  const { data: webhooks, isLoading, error } = useWebhooks();
  const { data: savedSearches } = useSavedSearches();

  const [revealSecret, setRevealSecret] = useState<string | null>(null);

  const isUnauthorized =
    error instanceof Error && error.message === "Unauthorized";

  // Build lookup: savedSearchId → name
  const savedSearchNameMap = new Map(
    savedSearches?.map((s) => [s.id, s.name]) ?? [],
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Receive a signed HTTP POST when a new job matches a saved search.
          </p>
        </div>
        {!isLoading && !isUnauthorized && !error && (
          <CreateWebhookForm onCreated={(secret) => setRevealSecret(secret)} />
        )}
      </div>

      <Separator className="mb-6" />

      {/* Body */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isUnauthorized ? (
        <UnauthenticatedState />
      ) : error ? (
        <p className="text-sm text-destructive">
          Failed to load webhooks. Please try again.
        </p>
      ) : !webhooks || webhooks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <SubscriptionCard
              key={w.id}
              subscription={w}
              savedSearchName={savedSearchNameMap.get(w.savedSearchId)}
            />
          ))}
        </div>
      )}

      {/* One-time secret reveal */}
      {revealSecret && (
        <SecretModal
          secret={revealSecret}
          onClose={() => setRevealSecret(null)}
        />
      )}
    </div>
  );
}
