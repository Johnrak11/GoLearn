import { Response } from "express";
import { updateProgressService } from "../services/progressService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";

const updateProgressSchema = z.object({
  lesson_id: z.string().uuid(),
  is_completed: z.boolean(),
  last_watched_position: z.number().min(0).optional(),
});

export const updateProgress = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return;
    const { lesson_id, is_completed, last_watched_position } =
      updateProgressSchema.parse(req.body);
    const userId = req.user.userId;
    const result = await updateProgressService({
      userId,
      lesson_id,
      is_completed,
      last_watched_position,
    });
    if ((result as any).error) {
      res.status(400).json(result);
      return;
    }
    res.json({ message: "Progress updated", ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
