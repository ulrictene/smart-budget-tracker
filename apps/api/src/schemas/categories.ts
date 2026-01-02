import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(["income", "expense"]),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50),
});
