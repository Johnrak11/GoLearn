import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debug() {
  console.log("--- DEBUGGING EARNINGS ---");

  // 1. Find user Vorak Yun
  const user = await prisma.user.findFirst({
    where: { full_name: { contains: "Vorak Yun" } },
  });

  if (!user) {
    console.log('User "Vorak Yun" not found');
    return;
  }

  console.log(`Found User: ${user.full_name} (ID: ${user.id})`);

  // 2. Find courses created by this user
  const courses = await prisma.course.findMany({
    where: { instructor_id: user.id },
    include: {
      _count: { select: { enrollments: true } },
    },
  });

  console.log(`\nCourses created by ${user.full_name}: ${courses.length}`);
  for (const c of courses) {
    console.log(
      `- ${c.title} (ID: ${c.id}) | Students: ${c._count.enrollments} | Price: ${c.price}`,
    );

    // 3. Find enrollments for this course
    const enrollments = await prisma.enrollment.findMany({
      where: { course_id: c.id },
    });

    console.log(`  Enrollments: ${enrollments.length}`);
    for (const en of enrollments) {
      console.log(`    Enrollment ID: ${en.id} | UserID: ${en.user_id}`);

      // 4. Find earning record for this enrollment
      const earning = await prisma.earningRecord.findUnique({
        where: { enrollment_id: en.id },
      });

      if (earning) {
        console.log(
          `    ✅ EarningRecord found: Gross: ${earning.gross_amount} | InstructorID: ${earning.instructor_id}`,
        );
        if (earning.instructor_id !== user.id) {
          console.log(
            `    ❌ WARNING: EarningRecord instructor_id (${earning.instructor_id}) does NOT match Course instructor_id (${user.id})`,
          );
        }
      } else {
        console.log(`    ❌ No EarningRecord found for this enrollment`);
      }
    }
  }

  // 5. Total earning records for this user
  const allEarnings = await prisma.earningRecord.findMany({
    where: { instructor_id: user.id },
  });
  console.log(
    `\nTotal EarningRecords found for ${user.full_name}: ${allEarnings.length}`,
  );
}

debug()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
