import { getToken } from "../../lib/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function downloadTransactionsCsv(params: {
  month: string;
  type?: "" | "income" | "expense";
  categoryId?: string;
}) {
  const qs = new URLSearchParams({ month: params.month });
  if (params.type) qs.set("type", params.type);
  if (params.categoryId) qs.set("categoryId", params.categoryId);

  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}/export/transactions.csv?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Export failed: ${res.status}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions_${params.month}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}
