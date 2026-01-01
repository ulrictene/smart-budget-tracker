import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./db";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      service: "api",
      db: "connected",
      time: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      service: "api",
      db: "disconnected",
      time: new Date().toISOString(),
    });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
