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

router.get("/summary", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { month } = req.query as { month?: string };

  if (!month) return res.status(400).json({ error: "month is required (YYYY-MM)" });

  const range = monthRange(month);
  if (!range) return res.status(400).json({ error: "Invalid month. Use YYYY-MM" });

  const where = {
    userId,
    date: { gte: range.start, lt: range.end },
  };

  // 1) Totals by type
  const totals = await prisma.transaction.groupBy({
    by: ["type"],
    where,
    _sum: { amount: true },
  });

  const totalIncome = totals.find((t) => t.type === "income")?._sum.amount ?? 0;
  const totalExpense = totals.find((t) => t.type === "expense")?._sum.amount ?? 0;

  // 2) Expense by category (for doughnut chart)
  const expenseByCategory = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { ...where, type: "expense" },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  const catIds = expenseByCategory.map((x) => x.categoryId);
  const cats = catIds.length
    ? await prisma.category.findMany({
        where: { id: { in: catIds }, userId },
        select: { id: true, name: true },
      })
    : [];

  const catNameById = new Map(cats.map((c) => [c.id, c.name]));

  const spendByCategory = expenseByCategory.map((x) => ({
    categoryId: x.categoryId,
    categoryName: catNameById.get(x.categoryId) || "Unknown",
    amount: x._sum.amount ?? 0,
  }));

  // 3) Daily expenses trend (simple approach: fetch + aggregate in JS)
  // (Keeps it database-agnostic and reliable with Prisma.)
  const dailyExpenseTx = await prisma.transaction.findMany({
    where: { ...where, type: "expense" },
    select: { amount: true, date: true },
    orderBy: { date: "asc" },
  });

  const dayMap = new Map<string, number>();
  for (const tx of dailyExpenseTx) {
    const key = tx.date.toISOString().slice(0, 10); // YYYY-MM-DD
    dayMap.set(key, (dayMap.get(key) || 0) + tx.amount);
  }

  const dailyExpense = Array.from(dayMap.entries()).map(([date, amount]) => ({
    date,
    amount,
  }));

  res.json({
    month,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    spendByCategory,
    dailyExpense,
  });
});

export default router;
