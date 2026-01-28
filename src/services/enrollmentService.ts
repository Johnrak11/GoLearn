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
