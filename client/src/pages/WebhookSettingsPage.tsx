// client/src/pages/WebhookSettingsPage.tsx
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { useWebhooks } from "@/hooks/useWebhooks";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { SecretModal } from "@/components/webhooks/SecretModal";
import { CreateWebhookForm } from "@/components/webhooks/CreateWebhookForm";
import { SubscriptionCard } from "@/components/webhooks/SubscriptionCard";
import { EmptyState } from "@/components/webhooks/EmptyState";
import { UnauthenticatedState } from "@/components/webhooks/UnauthenticatedState";
import { LoadingSkeleton } from "@/components/webhooks/LoadingSkeleton";

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
