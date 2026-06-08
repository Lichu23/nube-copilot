import { z } from "zod";

export const chatMessageSchema = z.object({
  content: z.string().trim().min(1).max(4_000),
  role: z.enum(["user", "assistant"]),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
});

export const aiAnalystResponseSchema = z.object({
  answer: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  recommendedActions: z.array(z.string()).default([]),
  evidence: z
    .array(
      z.object({
        metric: z.string(),
        value: z.union([z.string(), z.number()]),
        period: z.string().optional(),
      }),
    )
    .default([]),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
