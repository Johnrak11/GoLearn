import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import prisma from "../config/prisma";

// Helper to verify module ownership through course
async function verifyModuleOwnership(
  req: AuthRequest,
  moduleId: string,
): Promise<{ error: string; status: number } | { module: any }> {
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });
  if (!module) return { error: "Module not found", status: 404 };
  if (
    module.course.instructor_id !== req.user?.userId &&
    req.user?.role !== "admin"
  ) {
    return { error: "Access denied", status: 403 };
  }
  return { module };
}

// Create a lesson in a module
export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { moduleId } = req.params;
    const { title, type, videoUrl, content, duration, isFree } = req.body;

    if (!title || title.trim().length < 2) {
      res.status(400).json({ error: "Lesson title is required (min 2 chars)" });
      return;
    }

    if (!type || !["VIDEO", "TEXT", "QUIZ", "PDF"].includes(type)) {
      res.status(400).json({ error: "Invalid lesson type" });
      return;
    }

    const check = await verifyModuleOwnership(req, moduleId);
    if ("error" in check) {
      res.status(check.status).json({ error: check.error });
      return;
    }

    // Get next order_index
    const maxOrder = await prisma.lesson.aggregate({
      where: { module_id: moduleId },
      _max: { order_index: true },
    });
    const nextOrder = (maxOrder._max.order_index ?? -1) + 1;

    // Create lesson
    const lesson = await prisma.lesson.create({
      data: {
        module_id: moduleId,
        title: title.trim(),
        type,
        order_index: nextOrder,
        is_free_preview: isFree || false,
      },
    });

    // If VIDEO type with a URL, create the Video record
    if (type === "VIDEO" && videoUrl) {
      await prisma.video.create({
        data: {
          lesson_id: lesson.id,
          provider: "S3", // Using S3/Cloudinary as default
          url: videoUrl,
          duration: duration || 0,
          status: "READY",
        },
      });
    }

    // Fetch full lesson with relations
    const fullLesson = await prisma.lesson.findUnique({
      where: { id: lesson.id },
      include: { video: true },
    });

    res.status(201).json(fullLesson);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a lesson
export const updateLesson = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { title, type, videoUrl, content, duration, isFree } = req.body;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: true } }, video: true },
    });
    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    if (
      lesson.module.course.instructor_id !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Update lesson
    await prisma.lesson.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(type && { type }),
        ...(isFree !== undefined && { is_free_preview: isFree }),
      },
    });

    // Handle video record
    if (type === "VIDEO" && videoUrl) {
      if (lesson.video) {
        await prisma.video.update({
          where: { id: lesson.video.id },
          data: {
            url: videoUrl,
            duration: duration || lesson.video.duration,
            status: "READY",
          },
        });
      } else {
        await prisma.video.create({
          data: {
            lesson_id: id,
            provider: "S3",
            url: videoUrl,
            duration: duration || 0,
            status: "READY",
          },
        });
      }
    }

    const updated = await prisma.lesson.findUnique({
      where: { id },
      include: { video: true },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a lesson
export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    if (
      lesson.module.course.instructor_id !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    await prisma.lesson.delete({ where: { id } });
    res.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
