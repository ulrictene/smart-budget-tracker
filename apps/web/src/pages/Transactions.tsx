import { useEffect, useMemo, useState } from "react";
import { listCategories, type Category } from "../features/categories/categoriesApi";
import {
  listTransactions,
  createTransaction,
  deleteTransaction,
  type Tx,
} from "../features/transactions/transactionsApi";
import {penniesFromInput, poundsFromPennies} from "../lib/money"
import { downloadTransactionsCsv } from "../features/export/exportCsv";
 
function toYYYYMM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}


export default function TransactionsPage() {
  const [month, setMonth] = useState(toYYYYMM(new Date()));
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [note, setNote] = useState("");
  const [filterType, setFilterType] = useState<"" | "income" | "expense">("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const filteredCats = useMemo(
    () => cats.filter((c) => c.type === type),
    [cats, type]
  );

  async function refresh(nextMonth = month) {
    const [c, t] = await Promise.all([
      listCategories(),
      listTransactions({
  month: nextMonth,
  ...(filterType ? { type: filterType } : {}),
  ...(filterCategoryId ? { categoryId: filterCategoryId } : {}),
})

    ]);
    setCats(c);
    setItems(t);
  }

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, filterType, filterCategoryId]);

  useEffect(() => {
    // when type changes, pick first matching category
    const first = filteredCats[0]?.id || "";
    setCategoryId(first);
  }, [type, filteredCats]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pennies = penniesFromInput(amountStr);
    if (!pennies) return setError("Enter a valid amount (e.g. 12.34)");
    if (!categoryId) return setError("Select a category");

    const iso = new Date(`${dateStr}T12:00:00.000Z`).toISOString();

    try {
      await createTransaction({
        categoryId,
        type,
        amount: pennies,
        date: iso,
        note: note.trim() || undefined,
      });

      setAmountStr("");
      setNote("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  }

  async function onDelete(tx: Tx) {
    if (!confirm(`Delete "${tx.category.name}" £${poundsFromPennies(tx.amount)}?`)) return;

    try {
      await deleteTransaction(tx.id);
      setItems((prev) => prev.filter((x) => x.id !== tx.id)); // instant UI
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>Transactions</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 0" }}>
        <label>
          Month{" "}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </div>
      <button
  type="button"
  onClick={async () => {
    try {
      await downloadTransactionsCsv({
        month,
        type: filterType,         
        categoryId: filterCategoryId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  }}
>
  Export CSV
</button>

      <div
  style={{
    display: "flex",
    gap: 12,
    alignItems: "center",
    margin: "12px 0",
    flexWrap: "wrap",
  }}
>
  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
    Type
    <select
      value={filterType}
      onChange={(e) => setFilterType(e.target.value as any)}
    >
      <option value="">All</option>
      <option value="expense">Expense</option>
      <option value="income">Income</option>
    </select>
  </label>

  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
    Category
    <select
      value={filterCategoryId}
      onChange={(e) => setFilterCategoryId(e.target.value)}
    >
      <option value="">All</option>
      {cats
        .filter((c) => (filterType ? c.type === filterType : true))
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
    </select>
  </label>

  {(filterType || filterCategoryId) && (
    <button
      type="button"
      onClick={() => {
        setFilterType("");
        setFilterCategoryId("");
      }}
    >
      Clear filters
    </button>
  )}
</div>


      <form onSubmit={onAdd} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="expense">expense</option>
            <option value="income">income</option>
          </select>

          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {filteredCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="Amount (e.g. 12.34)"
          />

          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            style={{ flex: 1, minWidth: 180 }}
          />

          <button type="submit">Add</button>
        </div>

        {error && <p style={{ color: "crimson", marginTop: 8 }}>{error}</p>}
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((tx) => (
            <div
              key={tx.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div>
                  <strong>{tx.category.name}</strong>{" "}
                  <span style={{ opacity: 0.7 }}>({tx.type})</span>
                </div>
                <div style={{ opacity: 0.8 }}>
                  {new Date(tx.date).toLocaleDateString()} {tx.note ? `• ${tx.note}` : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <strong>£{poundsFromPennies(tx.amount)}</strong>
                <button onClick={() => onDelete(tx)}>Delete</button>
              </div>
            </div>
          ))}

          {items.length === 0 && <p>No transactions for this month yet.</p>}
        </div>
      )}
    </div>
  );
}
