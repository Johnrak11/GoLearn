import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import prisma from "../config/prisma";

// Helper to verify course ownership
async function verifyCourseOwnership(
  req: AuthRequest,
  courseId: string,
): Promise<{ error: string; status: number } | { course: any }> {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "Course not found", status: 404 };
  if (course.instructor_id !== req.user?.userId && req.user?.role !== "admin") {
    return { error: "Access denied", status: 403 };
  }
  return { course };
}

// Create a module for a course
export const createModule = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { courseId } = req.params;
    const { title } = req.body;

    if (!title || title.trim().length < 2) {
      res.status(400).json({ error: "Module title is required (min 2 chars)" });
      return;
    }

    const check = await verifyCourseOwnership(req, courseId);
    if ("error" in check) {
      res.status(check.status).json({ error: check.error });
      return;
    }

    // Get next order_index
    const maxOrder = await prisma.module.aggregate({
      where: { course_id: courseId },
      _max: { order_index: true },
    });
    const nextOrder = (maxOrder._max.order_index ?? -1) + 1;

    const module = await prisma.module.create({
      data: {
        course_id: courseId,
        title: title.trim(),
        order_index: nextOrder,
      },
      include: {
        lessons: true,
      },
    });

    res.status(201).json(module);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a module
export const updateModule = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { title } = req.body;

    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!module) {
      res.status(404).json({ error: "Module not found" });
      return;
    }

    const check = await verifyCourseOwnership(req, module.course_id);
    if ("error" in check) {
      res.status(check.status).json({ error: check.error });
      return;
    }

    const updated = await prisma.module.update({
      where: { id },
      data: { ...(title && { title: title.trim() }) },
      include: { lessons: true },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a module
export const deleteModule = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!module) {
      res.status(404).json({ error: "Module not found" });
      return;
    }

    const check = await verifyCourseOwnership(req, module.course_id);
    if ("error" in check) {
      res.status(check.status).json({ error: check.error });
      return;
    }

    await prisma.module.delete({ where: { id } });
    res.json({ message: "Module deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
