import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";
import {
  initiatePaymentService,
  getPaymentStatusService,
} from "../services/paymentService";

const initiateSchema = z.object({
  course_id: z.string().uuid(),
});

// POST /payments/initiate
export const initiatePayment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { course_id } = initiateSchema.parse(req.body);
    const result = await initiatePaymentService(req.user.userId, course_id);
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

// GET /payments/status/:orderId
export const getPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const result = await getPaymentStatusService(
      req.params.orderId,
      req.user.userId,
    );
    if ((result as { error?: string }).error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};
