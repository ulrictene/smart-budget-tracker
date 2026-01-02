import { Router } from "express";
import OpenAI from "openai";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { prisma } from "../db";

const router = Router();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;

  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

router.get("/ai/summary", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set" });
    }

    const userId = req.userId!;
    const { month } = req.query as { month?: string };

    if (!month) return res.status(400).json({ error: "month is required (YYYY-MM)" });

    const range = monthRange(month);
    if (!range) return res.status(400).json({ error: "Invalid month. Use YYYY-MM" });

    const where = { userId, date: { gte: range.start, lt: range.end } };

    const totals = await prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
    });
    const totalIncome = totals.find((t) => t.type === "income")?._sum.amount ?? 0;
    const totalExpense = totals.find((t) => t.type === "expense")?._sum.amount ?? 0;

    const expenseByCategory = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { ...where, type: "expense" },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 8,
    });

    const catIds = expenseByCategory.map((x) => x.categoryId);
    const cats = catIds.length
      ? await prisma.category.findMany({
          where: { id: { in: catIds }, userId },
          select: { id: true, name: true },
        })
      : [];

    const catNameById = new Map(cats.map((c) => [c.id, c.name]));
    const topSpend = expenseByCategory.map((x) => ({
      category: catNameById.get(x.categoryId) || "Unknown",
      amount: x._sum.amount ?? 0,
    }));

    const input = {
      month,
      totals: {
        income_gbp: (totalIncome / 100).toFixed(2),
        expense_gbp: (totalExpense / 100).toFixed(2),
        net_gbp: ((totalIncome - totalExpense) / 100).toFixed(2),
      },
      topSpend: topSpend.map((x) => ({
        category: x.category,
        amount_gbp: (x.amount / 100).toFixed(2),
      })),
    };

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are a personal finance assistant. Summarize the user's month clearly and practically. " +
            "Be concise, use GBP, and give 3 actionable recommendations. " +
            "Return JSON with keys: headline, bullets (array), recommendations (array).",
        },
        {
          role: "user",
          content: `Here is the user's monthly budget data (JSON):\n${JSON.stringify(input)}`,
        },
      ],
    });

  
    const text =
      response.output_text?.trim() ||
      "";

    return res.json({ month, ai: text, input });
} catch (err: any) {
  console.error("AI_SUMMARY_ERROR:", err);

  // Handle quota / rate limit cleanly
  if (err?.status === 429 || err?.code === "insufficient_quota") {
    return res.status(200).json({
      month: req.query.month,
      ai: "AI summary is temporarily unavailable due to usage limits. Please try again later.",
      fallback: true,
    });
  }

  return res.status(500).json({
    error: "AI_SUMMARY_FAILED",
    message: err?.message || "Internal server error",
  });
}

});

export default router;
