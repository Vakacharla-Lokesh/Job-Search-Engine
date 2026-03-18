import { Schema, model, type InferSchemaType } from "mongoose";

const webhookDeliverySchema = new Schema({
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: "WebhookSubscription",
    required: true,
    index: true,
  },
  jobId: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  responseStatus: { type: Number, default: null },
  error: { type: String, default: null },
  sentAt: { type: Date, default: Date.now },
  success: { type: Boolean, required: true },
});

export type WebhookDelivery = InferSchemaType<typeof webhookDeliverySchema>;
export const WebhookDeliveryModel = model(
  "WebhookDelivery",
  webhookDeliverySchema,
);
