import { api } from "../../lib/api";

export type AiSummaryResponse =
  | { month: string; fallback: false; ai: string }
  | { month: string; fallback: true; ai: null; reason: string; message: string };

export function getAiSummary(month: string) {
  return api<AiSummaryResponse>(`/ai/summary?month=${encodeURIComponent(month)}`);
}

