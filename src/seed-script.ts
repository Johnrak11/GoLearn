import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetAndSeed() {
  console.log("Wiping database...");
  await prisma.paymentTransaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.earningRecord.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.category.deleteMany();
  await prisma.forumReply.deleteMany();
  await prisma.forumPost.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding fresh data...");

  // Roles
  const adminRole = await prisma.role.create({ data: { name: "admin" } });
  const instructorRole = await prisma.role.create({
    data: { name: "instructor" },
  });
  const studentRole = await prisma.role.create({ data: { name: "student" } });

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Users
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@golearn.com",
      password_hash: hashedPassword,
      full_name: "System Admin",
      roles: { create: [{ role_id: adminRole.id }] },
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: "teacher@golearn.com",
      password_hash: hashedPassword,
      full_name: "John Instructor",
      bio: "Expert Android Developer",
      roles: { create: [{ role_id: instructorRole.id }] },
    },
  });

  const studentUser = await prisma.user.create({
    data: {
      email: "student@golearn.com",
      password_hash: hashedPassword,
      full_name: "Alice Student",
      roles: { create: [{ role_id: studentRole.id }] },
    },
  });

  // Category & Course
  const techCat = await prisma.category.create({
    data: { name: "Technology", description: "Tech courses" },
  });

  const course = await prisma.course.create({
    data: {
      title: "Advanced Android Development",
      description: "Master Android development with Java and Kotlin.",
      price: 15.0,
      instructor_id: teacherUser.id,
      category_id: techCat.id,
      status: "PUBLISHED",
      thumbnail_url: "https://via.placeholder.com/600x400",
    },
  });

  // Module & Lesson
  const module1 = await prisma.module.create({
    data: {
      course_id: course.id,
      title: "Module 1: UI & UX",
      description: "Building beautiful apps",
      orderIndex: 1,
    },
  });

  await prisma.lesson.create({
    data: {
      module_id: module1.id,
      title: "Lesson 1: ConstraintLayout",
      content: "Learn how to use ConstraintLayout.",
      video_url:
        "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
      orderIndex: 1,
      is_free: true,
    },
  });

  console.log("Database reset and seeded successfully.");
}

resetAndSeed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
