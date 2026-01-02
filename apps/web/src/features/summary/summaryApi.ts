import { api } from "../../lib/api";

export type Summary = {
  month: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  spendByCategory: { categoryId: string; categoryName: string; amount: number }[];
  dailyExpense: { date: string; amount: number }[];
};

export function getSummary(month: string) {
  return api<Summary>(`/summary?month=${encodeURIComponent(month)}`);
}
