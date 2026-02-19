import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import {
  createCourseService,
  listPublishedCoursesService,
  getCourseCurriculumService,
} from "../services/courseService";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const createCourseSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  price: z.number().min(0),
  thumbnail_url: z.string().url().optional(),
});

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (
      !req.user ||
      !req.user.roles.some((r) => ["instructor", "admin"].includes(r))
    ) {
      res
        .status(403)
        .json({ error: "Only instructors and admins can create courses" });
      return;
    }

    const { title, description, price, thumbnail_url } =
      createCourseSchema.parse(req.body);

    // Auto-generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");

    const course = await createCourseService({
      instructorId: req.user.userId,
      title,
      description,
      price,
      thumbnail_url,
    });

    res.status(201).json(course);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    const whereClause: any = {
      status: "PUBLISHED",
    };

    if (search) {
      whereClause.title = {
        contains: String(search),
      };
    }

    const courses = await listPublishedCoursesService(
      search as string | undefined,
    );

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let userId: string | null = null;

    // Optional Authentication to check enrollment
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        userId = decoded.userId;
      } catch (err) {
        // Ignore invalid token, treat as guest
      }
    }

    // Enrollment check handled in service

    const course = await getCourseCurriculumService(id, userId);

    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    // Transform response to hide content if not enrolled
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listInstructorCourses = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Admin can see all, Instructor sees only theirs
    const where: any = {};
    if (req.user?.role !== "admin") {
      where.instructor_id = userId;
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
    });

    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { title, description, price, image_url } = req.body;

    // Check course exists and user owns it (or is admin)
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.instructor_id !== req.user.userId && req.user.role !== "admin") {
      res.status(403).json({ error: "You can only edit your own courses" });
      return;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(image_url && { thumbnail_url: image_url }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.instructor_id !== req.user.userId && req.user.role !== "admin") {
      res.status(403).json({ error: "You can only delete your own courses" });
      return;
    }

    await prisma.course.delete({ where: { id } });
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleCourseStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { status } = req.body; // "PUBLISHED" or "DRAFT"

    if (!status || !["PUBLISHED", "DRAFT", "ARCHIVED"].includes(status)) {
      res
        .status(400)
        .json({
          error: "Invalid status. Must be PUBLISHED, DRAFT, or ARCHIVED",
        });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.instructor_id !== req.user.userId && req.user.role !== "admin") {
      res.status(403).json({ error: "You can only modify your own courses" });
      return;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
