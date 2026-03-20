// src/services/webhookService.ts
import { Types } from "mongoose";
import { randomBytes } from "crypto";
import { WebhookSubscriptionModel } from "@/models/WebhookSubscription";
import { WebhookDeliveryModel } from "@/models/WebhookDelivery";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreateSubscriptionInput {
  savedSearchId: string;
  url: string;
}

export interface SubscriptionResponse {
  id: string;
  savedSearchId: string;
  url: string;
  active: boolean;
  createdAt: Date;
  // Secret is only included in the create response — never returned again
  secret?: string;
}

export interface DeliveryResponse {
  id: string;
  subscriptionId: string;
  jobId: string;
  success: boolean;
  responseStatus: number | null;
  error: string | null;
  sentAt: Date;
}

// Lean Mongoose doc shapes — mirrors the schema, avoids fighting InferSchemaType
interface RawSubscriptionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  savedSearchId: Types.ObjectId;
  url: string;
  secret: string;
  active: boolean;
  createdAt: Date;
}

interface RawDeliveryDoc {
  _id: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  jobId: string;
  success: boolean;
  responseStatus: number | null;
  error: string | null;
  sentAt: Date;
}

// ─── Formatting ────────────────────────────────────────────────────────────────

function formatSubscription(
  doc: RawSubscriptionDoc,
  includeSecret?: string,
): SubscriptionResponse {
  return {
    id: doc._id.toString(),
    savedSearchId: doc.savedSearchId.toString(),
    url: doc.url,
    active: doc.active,
    createdAt: doc.createdAt,
    ...(includeSecret ? { secret: includeSecret } : {}),
  };
}

function formatDelivery(doc: RawDeliveryDoc): DeliveryResponse {
  return {
    id: doc._id.toString(),
    subscriptionId: doc.subscriptionId.toString(),
    jobId: doc.jobId,
    success: doc.success,
    responseStatus: doc.responseStatus ?? null,
    error: doc.error ?? null,
    sentAt: doc.sentAt,
  };
}

// ─── Service Functions ─────────────────────────────────────────────────────────

export async function createSubscription(
  userId: string,
  input: CreateSubscriptionInput,
): Promise<SubscriptionResponse> {
  if (!Types.ObjectId.isValid(input.savedSearchId)) {
    throw new Error("Invalid savedSearchId");
  }

  // Generate a cryptographically random secret — 32 bytes = 64 hex chars
  const secret = randomBytes(32).toString("hex");

  const doc = await WebhookSubscriptionModel.create({
    userId: new Types.ObjectId(userId),
    savedSearchId: new Types.ObjectId(input.savedSearchId),
    url: input.url,
    secret,
    active: true,
  });

  // Return secret exactly once — it is never retrievable again after this
  return formatSubscription(doc as unknown as RawSubscriptionDoc, secret);
}

export async function listSubscriptions(
  userId: string,
): Promise<SubscriptionResponse[]> {
  const docs = await WebhookSubscriptionModel.find({
    userId: new Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return docs.map((doc) =>
    formatSubscription(doc as unknown as RawSubscriptionDoc),
  );
}

export async function deleteSubscription(
  userId: string,
  subscriptionId: string,
): Promise<boolean> {
  if (!Types.ObjectId.isValid(subscriptionId)) return false;

  const doc = await WebhookSubscriptionModel.findOneAndDelete({
    _id: new Types.ObjectId(subscriptionId),
    userId: new Types.ObjectId(userId),
  }).lean();

  return doc !== null;
}

export async function toggleSubscription(
  userId: string,
  subscriptionId: string,
  active: boolean,
): Promise<SubscriptionResponse | null> {
  if (!Types.ObjectId.isValid(subscriptionId)) return null;

  const doc = await WebhookSubscriptionModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(subscriptionId),
      userId: new Types.ObjectId(userId),
    },
    { active },
    { new: true },
  ).lean();

  if (!doc) return null;
  return formatSubscription(doc as unknown as RawSubscriptionDoc);
}

export async function listDeliveries(
  userId: string,
  subscriptionId: string,
): Promise<DeliveryResponse[]> {
  if (!Types.ObjectId.isValid(subscriptionId)) return [];

  // Verify ownership before returning delivery logs
  const sub = await WebhookSubscriptionModel.findOne({
    _id: new Types.ObjectId(subscriptionId),
    userId: new Types.ObjectId(userId),
  })
    .select("_id")
    .lean();

  if (!sub) return [];

  const docs = await WebhookDeliveryModel.find({
    subscriptionId: new Types.ObjectId(subscriptionId),
  })
    .sort({ sentAt: -1 })
    .limit(100) // cap — delivery history is for debugging, not analytics
    .lean();

  return docs.map((doc) => formatDelivery(doc as unknown as RawDeliveryDoc));
}
