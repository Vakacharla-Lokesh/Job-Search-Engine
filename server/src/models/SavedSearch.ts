import { Schema, model, type InferSchemaType } from "mongoose";

const savedSearchSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  name: { type: String, required: true },
  query: { type: String, required: true },
  filters: {
    location: { type: [String], default: [] },
    salary_min: { type: Number, default: null },
    remote: { type: Boolean, default: null },
  },
  percolatorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastAlertAt: { type: Date, default: null },
});

export type SavedSearch = InferSchemaType<typeof savedSearchSchema>;
export const SavedSearchModel = model("SavedSearch", savedSearchSchema);
