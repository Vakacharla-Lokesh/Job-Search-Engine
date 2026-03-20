import { useSearchParams } from "react-router";
import { z } from "zod";
import { useCallback } from "react";

const searchSchema = z.object({
  q: z.string().default(""),
  location: z.string().optional(),
  remote: z.preprocess(
    (v) => (v === "true" ? true : v === "false" ? false : undefined),
    z.boolean().optional(),
  ),
  salary_min: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().int().nonnegative().optional(),
  ),
  sort: z.enum(["relevance", "date", "salary"]).default("relevance"),
  page: z.preprocess(
    (v) => (v ? Number(v) : 1),
    z.number().int().min(1).default(1),
  ),
  jobId: z.string().optional(),
  job_type: z
    .enum(["full_time", "part_time", "contract", "internship"])
    .optional(),
  experience_level: z.enum(["entry", "mid", "senior", "lead"]).optional(),
  skills: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    ),
  source: z
    .enum(["remotive", "hn", "arbeitnow", "themuse", "adzuna"])
    .optional(),
});

export type SearchFilters = z.infer<typeof searchSchema>;

export function useSearchFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = Object.fromEntries(searchParams.entries());
  const filters = searchSchema.parse(raw);

  const setFilters = useCallback(
    (update: Partial<SearchFilters>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(update)) {
          if (v === undefined || v === null || v === "") {
            next.delete(k);
          } else if (Array.isArray(v)) {
            if (v.length === 0) next.delete(k);
            else next.set(k, v.join(","));
          } else {
            next.set(k, String(v));
          }
        }
        return next;
      });
    },
    [setSearchParams],
  );

  return { filters, setFilters };
}
