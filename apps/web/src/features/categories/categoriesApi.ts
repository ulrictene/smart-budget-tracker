import { api } from "../../lib/api";

export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  createdAt: string;
};

export function listCategories() {
  return api<Category[]>("/categories");
}

export function createCategory(input: { name: string; type: "income" | "expense" }) {
  return api<Category>("/categories", { method: "POST", body: JSON.stringify(input) });
}

export function updateCategory(id: string, input: { name: string }) {
  return api<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteCategory(id: string) {
  return api<void>(`/categories/${id}`, { method: "DELETE" });
}
