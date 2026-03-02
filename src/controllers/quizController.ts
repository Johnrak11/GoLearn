import { Response } from "express";
import {
  getQuizService,
  getQuizByLessonIdService,
  createQuizService,
  updateQuizService,
  deleteQuizService,
  submitQuizService,
} from "../services/quizService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";

// ============ Validation Schemas ============

const optionSchema = z.object({
  text: z.string().min(1),
  is_correct: z.boolean(),
});

const questionSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SINGLE_CHOICE"]),
  points: z.number().min(1).optional(),
  options: z.array(optionSchema).min(2),
});

const createQuizSchema = z.object({
  title: z.string().min(1),
  passing_score: z.number().min(0).max(100).optional(),
  questions: z.array(questionSchema).min(1),
});

const updateQuizSchema = z.object({
  title: z.string().min(1).optional(),
  passing_score: z.number().min(0).max(100).optional(),
  questions: z.array(questionSchema).optional(),
});

const submitQuizSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      option_id: z.string().uuid(),
    }),
  ),
});

// ============ Controllers ============

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

export const getQuizByLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const quiz = await getQuizByLessonIdService(lessonId);

    if (!quiz) {
      res.status(404).json({ error: "No quiz found for this lesson" });
      return;
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createQuiz = async (req: AuthRequest, res: Response) => {
  try {
    if (
      !req.user ||
      !req.user.roles.some((r) => ["instructor", "admin"].includes(r))
    ) {
      res
        .status(403)
        .json({ error: "Only instructors and admins can create quizzes" });
      return;
    }

    const { lessonId } = req.params;
    const body = createQuizSchema.parse(req.body);

    const result = await createQuizService({
      lessonId,
      title: body.title,
      passing_score: body.passing_score,
      questions: body.questions,
    });

    if ((result as any).error) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

export const updateQuiz = async (req: AuthRequest, res: Response) => {
  try {
    if (
      !req.user ||
      !req.user.roles.some((r) => ["instructor", "admin"].includes(r))
    ) {
      res
        .status(403)
        .json({ error: "Only instructors and admins can update quizzes" });
      return;
    }

    const { id } = req.params;
    const body = updateQuizSchema.parse(req.body);

    const result = await updateQuizService({
      quizId: id,
      ...body,
    });

    if ((result as any)?.error) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

export const deleteQuiz = async (req: AuthRequest, res: Response) => {
  try {
    if (
      !req.user ||
      !req.user.roles.some((r) => ["instructor", "admin"].includes(r))
    ) {
      res
        .status(403)
        .json({ error: "Only instructors and admins can delete quizzes" });
      return;
    }

    const { id } = req.params;
    const result = await deleteQuizService(id);

    if ((result as any).error) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error(error);
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
