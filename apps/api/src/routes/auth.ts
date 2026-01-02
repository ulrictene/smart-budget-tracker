import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db";
import { signToken } from "../utils/jwt";
import { validateBody } from "../middleware/validate";
import { registerSchema, loginSchema } from "../schemas/auth";


const router = Router();

/**
 * POST /auth/register
 */
router.post("/register", validateBody(registerSchema),  async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };


  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  const token = signToken({ userId: user.id });

  res.status(201).json({ token });
});

/**
 * POST /auth/login
 */
router.post("/login", validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ userId: user.id });

  res.json({ token });
});

export default router;
