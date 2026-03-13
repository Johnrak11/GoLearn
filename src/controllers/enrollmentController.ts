import { Response } from "express";
import * as enrollmentService from "../services/enrollmentService";
import { AuthRequest } from "../middlewares/authMiddleware";

/**
 * GET /api/enrollments/my-courses
 * Fetch current user's enrolled courses
 * Query params: status=in_progress|completed
 */
export const getMyEnrollments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const status = req.query.status as "in_progress" | "completed" | undefined;

    // Validate status if provided
    if (status && !["in_progress", "completed"].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Use "in_progress" or "completed"',
      });
    }

    const enrollments = await enrollmentService.getMyEnrollments(
      userId,
      status,
    );

    return res.json({ data: enrollments });
  } catch (error: any) {
    console.error("Error fetching enrollments:", error);
    res.status(500).json({
      message: "Failed to fetch enrollments",
      error: error.message,
    });
  }
};

export const checkEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isEnrolled = await enrollmentService.checkEnrollment(
      userId,
      courseId,
    );
    res.json({ isEnrolled });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const enrollUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const enrollment = await enrollmentService.enrollUser(userId, courseId);
    res.json(enrollment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
