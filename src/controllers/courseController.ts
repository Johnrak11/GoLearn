import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";
import jwt from "jsonwebtoken";
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
    if (!req.user || req.user.role !== "instructor") {
      res.status(403).json({ error: "Only instructors can create courses" });
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
      search as string | undefined
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
