import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listWebhooks,
  createWebhook,
  deleteWebhook,
  toggleWebhook,
  listWebhookDeliveries,
  testWebhook,
} from "@/lib/api";

export const WEBHOOKS_KEY = ["webhooks"] as const;

const noRetryOn401 = (failureCount: number, error: unknown) => {
  if ((error as Error).message.startsWith("Unauthorized")) return false;
  return failureCount < 1;
};

export function useWebhooks() {
  return useQuery({
    queryKey: WEBHOOKS_KEY,
    queryFn: listWebhooks,
    retry: noRetryOn401,
  });
}

export function useWebhookDeliveries(subscriptionId: string | null) {
  return useQuery({
    queryKey: ["webhooks", subscriptionId, "deliveries"] as const,
    queryFn: () => listWebhookDeliveries(subscriptionId!),
    enabled: subscriptionId !== null,
    retry: noRetryOn401,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { savedSearchId: string; url: string }) =>
      createWebhook(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WEBHOOKS_KEY });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WEBHOOKS_KEY });
    },
  });
}

export function useToggleWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggleWebhook(id, active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WEBHOOKS_KEY });
    },
  });
}

export function useTestWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testWebhook(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: ["webhooks", id, "deliveries"],
      });
    },
  });
}
