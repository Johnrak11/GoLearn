import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get user's enrolled courses with optional filtering by completion status
 * @param userId - The ID of the user
 * @param status - Optional filter: 'in_progress' or 'completed'
 */
export const getMyEnrollments = async (
  userId: string,
  status?: "in_progress" | "completed",
) => {
  const whereClause: any = {
    user_id: userId,
  };

  // Filter by completion status
  if (status === "completed") {
    whereClause.completed_at = { not: null };
  } else if (status === "in_progress") {
    whereClause.completed_at = null;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: whereClause,
    include: {
      course: {
        include: {
          instructor: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      },
    },
    orderBy: {
      enrolled_at: "desc",
    },
  });

  return enrollments;
};

export const checkEnrollment = async (userId: string, courseId: string) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      user_id_course_id: {
        user_id: userId,
        course_id: courseId,
      },
    },
  });
  return !!enrollment;
};

export const enrollUser = async (userId: string, courseId: string) => {
  // 1. Check if course exists and is published
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course || course.status !== "PUBLISHED") {
    throw new Error("Course not found or not available");
  }

  // 2. Check if already enrolled
  const existing = await checkEnrollment(userId, courseId);
  if (existing) {
    throw new Error("User already enrolled");
  }

  // 3. Check price (Simple logic: Free courses only for direct enroll)
  // TODO: Add payment verification for paid courses
  if (Number(course.price) > 0) {
    throw new Error("Cannot directly enroll in paid course. Payment required.");
  }

  // 4. Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      user_id: userId,
      course_id: courseId,
      status: "ACTIVE",
      progress_pct: 0,
    },
  });

  return enrollment;
};
