import { Schema, model, type InferSchemaType } from "mongoose";

const webhookSubscriptionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  savedSearchId: {
    type: Schema.Types.ObjectId,
    ref: "SavedSearch",
    required: true,
  },
  url: { type: String, required: true },
  secret: { type: String, required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export type WebhookSubscription = InferSchemaType<
  typeof webhookSubscriptionSchema
>;
export const WebhookSubscriptionModel = model(
  "WebhookSubscription",
  webhookSubscriptionSchema,
);
