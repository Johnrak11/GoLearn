import prisma from "../config/prisma";

export async function getAdminStatsService() {
  const [totalUsers, activeCourses, totalEnrollments, revenueData] =
    await Promise.all([
      prisma.user.count(),
      prisma.course.count({ where: { status: "PUBLISHED" } }),
      prisma.enrollment.count(),
      prisma.earningRecord.aggregate({
        _sum: {
          gross_amount: true,
        },
      }),
    ]);

  return {
    totalUsers,
    activeCourses,
    totalEnrollments,
    totalRevenue: Number(revenueData._sum.gross_amount || 0),
    // Placeholder for growth data if we had monthly snapshots
    growth: {
      users: "+12.5%",
      courses: "+8.2%",
      enrollments: "+23.1%",
      revenue: "-2.4%",
    },
  };
}

export async function getInstructorStatsService(instructorId: string) {
  const [totalStudents, activeCourses, revenueData] = await Promise.all([
    prisma.enrollment.count({
      where: {
        course: {
          instructor_id: instructorId,
        },
      },
    }),
    prisma.course.count({
      where: {
        instructor_id: instructorId,
        status: "PUBLISHED",
      },
    }),
    prisma.earningRecord.aggregate({
      where: {
        instructor_id: instructorId,
      },
      _sum: {
        net_amount: true,
      },
    }),
  ]);

  return {
    totalStudents,
    activeCourses,
    totalEarnings: Number(revenueData._sum.net_amount || 0),
    growth: {
      students: "+10%",
      revenue: "+15%",
    },
  };
}
