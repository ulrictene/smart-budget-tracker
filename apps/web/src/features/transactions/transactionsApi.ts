import { api } from "../../lib/api";

export type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number; 
  date: string;
  note: string | null;
  createdAt: string;
  category: { id: string; name: string; type: "income" | "expense" };
};

export function listTransactions(params: {
  month: string; // YYYY-MM
  type?: "income" | "expense";
  categoryId?: string;
}) {
  const qs = new URLSearchParams({ month: params.month });
  if (params.type) qs.set("type", params.type);
  if (params.categoryId) qs.set("categoryId", params.categoryId);

  return api<Tx[]>(`/transactions?${qs.toString()}`);
}

export function createTransaction(input: {
  categoryId: string;
  type: "income" | "expense";
  amount: number; 
  date: string; 
  note?: string;
}) {
  return api<Tx>("/transactions", { method: "POST", body: JSON.stringify(input) });
}

export function deleteTransaction(id: string) {
  return api<void>(`/transactions/${id}`, { method: "DELETE" });
}

export function updateTransaction(id: string, input: Partial<{
  categoryId: string;
  amount: number;
  date: string;
  note: string | null;
}>) {
  return api<Tx>(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}
