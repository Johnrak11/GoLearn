import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";
import {
  getExamByCourseService,
  getExamByCourseWithAnswersService,
  checkExamEligibilityService,
  createExamService,
  updateExamService,
  deleteExamService,
  submitExamService,
  getMyExamAttemptsService,
} from "../services/examService";

// ============ Validation Schemas ============
const examOptionSchema = z.object({
  text: z.string().min(1),
  is_correct: z.boolean(),
});

const examQuestionSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SINGLE_CHOICE"]),
  points: z.number().min(1).optional(),
  options: z.array(examOptionSchema).min(2),
});

const createExamSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  passing_score: z.number().min(0).max(100).optional(),
  time_limit: z.number().min(1).optional(),
  questions: z.array(examQuestionSchema).min(1),
});

const updateExamSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  passing_score: z.number().min(0).max(100).optional(),
  time_limit: z.number().min(1).optional(),
  questions: z.array(examQuestionSchema).optional(),
});

const submitExamSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      option_id: z.string().uuid(),
    }),
  ),
});

// ============ GET /exams/course/:courseId ============
export const getExamByCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const isInstructor = req.user?.roles?.some((r) =>
      ["instructor", "admin"].includes(r),
    );

    const exam = isInstructor
      ? await getExamByCourseWithAnswersService(courseId)
      : await getExamByCourseService(courseId);

    if (!exam) {
      res.status(404).json({ error: "No exam found for this course" });
      return;
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============ GET /exams/course/:courseId/eligibility ============
export const checkEligibility = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { courseId } = req.params;
    const result = await checkExamEligibilityService(req.user.userId, courseId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============ POST /exams/course/:courseId ============
export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.roles?.some((r) => ["instructor", "admin"].includes(r))) {
      res
        .status(403)
        .json({ error: "Only instructors and admins can create exams" });
      return;
    }
    const { courseId } = req.params;
    const body = createExamSchema.parse(req.body);
    const result = await createExamService({ courseId, ...body });
    if ((result as { error?: string }).error) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

// ============ PATCH /exams/:id ============
export const updateExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.roles?.some((r) => ["instructor", "admin"].includes(r))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const body = updateExamSchema.parse(req.body);
    const result = await updateExamService({ examId: id, ...body });
    if ((result as { error?: string } | null)?.error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

// ============ DELETE /exams/:id ============
export const deleteExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.roles?.some((r) => ["instructor", "admin"].includes(r))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const result = await deleteExamService(id);
    if ((result as { error?: string }).error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============ POST /exams/:id/submit ============
export const submitExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { id } = req.params;
    const { courseId } = req.query as { courseId: string };
    if (!courseId) {
      res.status(400).json({ error: "courseId query param is required" });
      return;
    }
    const { answers } = submitExamSchema.parse(req.body);

    // Check eligibility first
    const eligibility = await checkExamEligibilityService(
      req.user.userId,
      courseId,
    );
    if (!eligibility.eligible) {
      res.status(403).json({ error: eligibility.reason, ...eligibility });
      return;
    }

    const result = await submitExamService({
      userId: req.user.userId,
      examId: id,
      courseId,
      answers,
    });

    if ((result as { error?: string }).error) {
      res.status(400).json(result);
      return;
    }
    res.json({ message: "Exam submitted", ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

// ============ GET /exams/course/:courseId/my-attempts ============
export const getMyAttempts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { courseId } = req.params;
    const result = await getMyExamAttemptsService(req.user.userId, courseId);
    if ((result as { error?: string }).error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
