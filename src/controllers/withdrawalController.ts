import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";
import {
  getMyEarningsService,
  requestWithdrawalService,
  getMyWithdrawalsService,
  getAllWithdrawalsService,
  reviewWithdrawalService,
} from "../services/withdrawalService";

const requestWithdrawalSchema = z.object({
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_name: z.string().optional(),
  note: z.string().optional(),
});

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
  admin_note: z.string().optional(),
});

// GET /withdrawals/earnings — Teacher: see my earnings
export const getMyEarnings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const result = await getMyEarningsService(req.user.userId);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /withdrawals/request — Teacher: request withdrawal
export const requestWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const body = requestWithdrawalSchema.parse(req.body);
    const result = await requestWithdrawalService({
      instructorId: req.user.userId,
      ...body,
    });
    if ((result as { error?: string }).error) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /withdrawals/my — Teacher: my withdrawal history
export const getMyWithdrawals = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json(await getMyWithdrawalsService(req.user.userId));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /withdrawals — Admin: all requests
export const getAllWithdrawals = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    res.json(await getAllWithdrawalsService(status as string | undefined));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

// PATCH /withdrawals/:id — Admin: approve/reject/mark paid
export const reviewWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const body = reviewSchema.parse(req.body);
    const result = await reviewWithdrawalService({ withdrawalId: id, ...body });
    if ((result as { error?: string }).error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
