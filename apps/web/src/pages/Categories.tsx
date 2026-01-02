import { useEffect, useState } from "react";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from "../features/categories/categoriesApi";

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");

  async function refresh() {
    setError(null);
    const data = await listCategories();
    setItems(data);
  }

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createCategory({ name: name.trim(), type });
      setName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  }

  async function onRename(cat: Category) {
    const newName = prompt("New category name:", cat.name);
    if (!newName?.trim()) return;

    try {
      await updateCategory(cat.id, { name: newName.trim() });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function onDelete(cat: Category) {
    if (!confirm(`Delete "${cat.name}"?`)) return;

    try {
      await deleteCategory(cat.id);
      setItems((prev) => prev.filter((x) => x.id !== cat.id));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Categories</h1>

      <form onSubmit={onAdd} style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rent"
        />
        <select value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="expense">expense</option>
          <option value="income">income</option>
        </select>
        <button type="submit">Add</button>
      </form>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div style={{ display: "grid", gap: 8 }}>
        {items.map((cat) => (
          <div
            key={cat.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{cat.name}</strong>{" "}
              <span style={{ opacity: 0.7 }}>({cat.type})</span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onRename(cat)}>Edit</button>
              <button onClick={() => onDelete(cat)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
