import { Response } from "express";
import { getQuizService, submitQuizService } from "../services/quizService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";

const submitQuizSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      option_id: z.string().uuid(),
    })
  ),
});

export const getQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const quiz = await getQuizService(id);

    if (!quiz) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const submitQuiz = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return;
    const { id } = req.params;
    const { answers } = submitQuizSchema.parse(req.body);
    const userId = req.user.userId;

    const result = await submitQuizService({ userId, id, answers });
    if ((result as any).error) {
      res.status(404).json(result);
      return;
    }
    res.json({ message: "Quiz submitted", ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
