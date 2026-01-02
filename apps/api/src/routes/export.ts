import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;

  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

function escapeCsv(value: unknown) {
  const s = String(value ?? "");
  // escape quotes by doubling them, wrap in quotes if it contains comma/newline/quote
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get("/export/transactions.csv", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { month, type, categoryId } = req.query as {
    month?: string;
    type?: "income" | "expense";
    categoryId?: string;
  };

  if (!month) return res.status(400).json({ error: "month is required (YYYY-MM)" });

  const range = monthRange(month);
  if (!range) return res.status(400).json({ error: "Invalid month. Use YYYY-MM" });

  const where: any = {
    userId,
    date: { gte: range.start, lt: range.end },
  };
  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;

  const rows = await prisma.transaction.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      date: true,
      type: true,
      amount: true,
      note: true,
      category: { select: { name: true } },
    },
  });

  const header = ["date", "type", "category", "amount_gbp", "note"];
  const lines = [header.join(",")];

  for (const r of rows) {
    const date = r.date.toISOString().slice(0, 10);
    const amountGbp = (r.amount / 100).toFixed(2);

    lines.push(
      [
        escapeCsv(date),
        escapeCsv(r.type),
        escapeCsv(r.category.name),
        escapeCsv(amountGbp),
        escapeCsv(r.note ?? ""),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const filename = `transactions_${month}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

export default router;
