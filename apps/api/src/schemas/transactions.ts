import { z } from "zod";

export const createTransactionSchema = z.object({
  categoryId: z.string().min(1),
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(), // pennies
  date: z.string().datetime(),
  note: z.string().max(200).optional(),
});

export const updateTransactionSchema = z.object({
  categoryId: z.string().min(1).optional(),
  amount: z.number().int().positive().optional(),
  date: z.string().datetime().optional(),
  note: z.string().max(200).nullable().optional(),
});
