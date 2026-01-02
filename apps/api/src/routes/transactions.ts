import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

function monthRange(month: string) {
  // month format: YYYY-MM
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;

  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

// GET /transactions?month=YYYY-MM&type=&categoryId=
router.get("/transactions", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { month, type, categoryId } = req.query as {
    month?: string;
    type?: "income" | "expense";
    categoryId?: string;
  };

  const where: any = { userId };

  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;

  if (month) {
    const range = monthRange(month);
    if (!range) return res.status(400).json({ error: "Invalid month. Use YYYY-MM" });
    where.date = { gte: range.start, lt: range.end };
  }

  const items = await prisma.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      amount: true,
      date: true,
      note: true,
      createdAt: true,
      category: { select: { id: true, name: true, type: true } },
    },
  });

  res.json(items);
});

// POST /transactions
router.post("/transactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { categoryId, type, amount, date, note } = req.body as {
      categoryId?: string;
      type?: "income" | "expense";
      amount?: number; 
      date?: string; 
      note?: string;
    };

    if (!categoryId || !type || amount === undefined || !date) {
      return res.status(400).json({ error: "categoryId, type, amount, date are required" });
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: "amount must be an integer > 0 (in pennies)" });
    }

    // ensure category belongs to user
    const cat = await prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true, type: true },
    });
    if (!cat) return res.status(404).json({ error: "Category not found" });

    // optional: enforce type matches category type
    if (cat.type !== type) {
      return res.status(400).json({ error: "Transaction type must match category type" });
    }

    const tx = await prisma.transaction.create({
      data: {
        userId,
        categoryId,
        type,
        amount,
        date: new Date(date),
        note: note?.trim() || null,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        date: true,
        note: true,
        createdAt: true,
        category: { select: { id: true, name: true, type: true } },
      },
    });

    return res.status(201).json(tx);
  } catch (err) {
    console.error("CREATE_TX_ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /transactions/:id
router.patch("/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: "Transaction not found" });

    const { categoryId, amount, date, note } = req.body as {
      categoryId?: string;
      amount?: number;
      date?: string;
      note?: string | null;
    };

    const data: any = {};

    if (categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: categoryId, userId },
        select: { id: true, type: true },
      });
      if (!cat) return res.status(404).json({ error: "Category not found" });
      data.categoryId = categoryId;
      data.type = cat.type;
    }

    if (amount !== undefined) {
      if (!Number.isInteger(amount) || amount <= 0) {
        return res.status(400).json({ error: "amount must be an integer > 0 (in pennies)" });
      }
      data.amount = amount;
    }

    if (date) data.date = new Date(date);
    if (note !== undefined) data.note = note?.trim() || null;

    const updated = await prisma.transaction.update({
      where: { id },
      data,
      select: {
        id: true,
        type: true,
        amount: true,
        date: true,
        note: true,
        createdAt: true,
        category: { select: { id: true, name: true, type: true } },
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("UPDATE_TX_ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /transactions/:id
router.delete("/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Transaction not found" });

  await prisma.transaction.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
