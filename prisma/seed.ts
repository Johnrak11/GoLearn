import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Create Roles
  const roleAdmin = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin", description: "System Administrator" },
  });

  const roleInstructor = await prisma.role.upsert({
    where: { name: "instructor" },
    update: {},
    create: { name: "instructor", description: "Course Creator" },
  });

  const roleStudent = await prisma.role.upsert({
    where: { name: "student" },
    update: {},
    create: { name: "student", description: "Learner" },
  });

  // 2. Create Instructor
  const passwordHash = await bcrypt.hash("password123", 10);
  const instructor = await prisma.user.upsert({
    where: { email: "instructor@example.com" },
    update: {},
    create: {
      email: "instructor@example.com",
      password_hash: passwordHash,
      full_name: "John Instructor",
      is_verified: true,
      roles: { create: { role_id: roleInstructor.id } },
    },
  });

  // 3. Create 5 Courses with 10 Lessons each
  for (let i = 1; i <= 5; i++) {
    const course = await prisma.course.create({
      data: {
        instructor_id: instructor.id,
        title: `Course ${i}: Mastery Series`,
        slug: `course-${i}-mastery`,
        description: `This is the detailed description for Course ${i}.`,
        price: 49.99 + i * 10,
        status: "PUBLISHED",
        modules: {
          create: [
            {
              title: "Module 1: Introduction",
              order_index: 1,
              lessons: {
                create: Array.from({ length: 5 }).map((_, j) => ({
                  title: `Lesson ${j + 1}: Basics`,
                  type: "VIDEO",
                  order_index: j + 1,
                  video: {
                    create: {
                      provider: "MUX",
                      url: `https://mux.com/assets/video_${i}_${j}`,
                      duration: 600,
                    },
                  },
                })),
              },
            },
            {
              title: "Module 2: Advanced Topics",
              order_index: 2,
              lessons: {
                create: Array.from({ length: 5 }).map((_, j) => ({
                  title: `Lesson ${j + 6}: Deep Dive`,
                  type: "TEXT",
                  order_index: j + 6,
                })),
              },
            },
          ],
        },
      },
    });
    console.log(`✅ Created Course ${i}: ${course.title}`);
  }

  // 4. Create Quiz
  // Find a lesson to attach quiz to
  const lesson = await prisma.lesson.findFirst();
  if (lesson) {
    await prisma.quiz.create({
      data: {
        lesson_id: lesson.id,
        title: "Final Quiz",
        passing_score: 70,
        questions: {
          create: [
            {
              prompt: "What is the capital of France?",
              type: "MULTIPLE_CHOICE",
              options: {
                create: [
                  { text: "Paris", is_correct: true },
                  { text: "London", is_correct: false },
                  { text: "Berlin", is_correct: false },
                ],
              },
            },
          ],
        },
      },
    });
    console.log("✅ Created Quiz");
  }

  console.log("🌱 Seed completed");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
