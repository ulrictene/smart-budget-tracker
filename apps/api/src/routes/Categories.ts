import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { validateBody } from "../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "../schemas/categories";

const router = Router();

// GET /categories
router.get("/categories", requireAuth, async (req: AuthRequest, res) => {
  const categories = await prisma.category.findMany({
    where: { userId: req.userId! },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, createdAt: true },
  });

  res.json(categories);
});

// POST /categories
router.post("/categories", requireAuth, validateBody(createCategorySchema),async (req: AuthRequest, res) => {
  try {
    const { name, type } = req.body as { name?: string; type?: "income" | "expense" };

    if (!name || !type) {
      return res.status(400).json({ error: "name and type are required" });
    }

    const category = await prisma.category.create({
      data: {
        userId: req.userId!,
        name: name.trim(),
        type,
      },
      select: { id: true, name: true, type: true, createdAt: true },
    });

    return res.status(201).json(category);
  } catch (err: any) {
    // Handle unique constraint (duplicate category name per user/type)
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Category already exists" });
    }
    console.error("CREATE_CATEGORY_ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /categories/:id
router.patch("/categories/:id", requireAuth, validateBody(updateCategorySchema),async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body as { name?: string };

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // Ensure the category belongs to this user
    const existing = await prisma.category.findFirst({
      where: { id, userId: req.userId! },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name: name.trim() },
      select: { id: true, name: true, type: true, createdAt: true },
    });

    return res.json(updated);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Category already exists" });
    }
    console.error("UPDATE_CATEGORY_ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /categories/:id
router.delete("/categories/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  const existing = await prisma.category.findFirst({
    where: { id, userId: req.userId! },
    select: { id: true },
  });

  if (!existing) {
    return res.status(404).json({ error: "Category not found" });
  }

  await prisma.category.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
