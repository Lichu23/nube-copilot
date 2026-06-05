import { z } from "zod";

export const aiAnalystResponseSchema = z.object({
  answer: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  recommendedActions: z.array(z.string()).default([]),
  evidence: z.array(
    z.object({
      metric: z.string(),
      value: z.union([z.string(), z.number()]),
      period: z.string().optional(),
    }),
  ),
});
