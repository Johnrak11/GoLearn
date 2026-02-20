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

  // 2. Create Users
  const passwordHash = await bcrypt.hash("password123", 10);

  // 2.1 Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password_hash: passwordHash,
      full_name: "System Admin",
      is_verified: true,
      roles: { create: { role_id: roleAdmin.id } },
    },
  });
  console.log("✅ Created Admin: admin@example.com");

  // 2.2 Instructor
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
  console.log("✅ Created Instructor: instructor@example.com");

  // 2.3 Student
  await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      email: "student@example.com",
      password_hash: passwordHash,
      full_name: "Jane Student",
      headline: "Eager Learner",
      is_verified: true,
      roles: { create: { role_id: roleStudent.id } },
    },
  });
  console.log("✅ Created Student: student@example.com");

  // 2.5 Create Tags
  const tags = ["Development", "Business", "Design", "Marketing"];
  for (const tagName of tags) {
    await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
  }
  console.log("✅ Created Tags");

  // 3. Create 5 Courses with 10 Lessons each
  for (let i = 1; i <= 5; i++) {
    const title = `Course ${i}: Mastery Series`;
    const slug = `course-${i}-mastery`;

    // Assign a random tag
    const randomTag = tags[Math.floor(Math.random() * tags.length)];

    // Check if course exists first to avoid complex upsert with nested relations
    const existingCourse = await prisma.course.findUnique({
      where: { slug },
    });

    if (!existingCourse) {
      const course = await prisma.course.create({
        data: {
          instructor_id: instructor.id,
          title: title,
          slug: slug,
          description: `This is the detailed description for Course ${i}.`,
          price: 49.99 + i * 10,
          status: "PUBLISHED",
          tags: {
            create: {
              tag: {
                connect: { name: randomTag },
              },
            },
          },
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
      console.log(
        `✅ Created Course ${i}: ${course.title} [Tag: ${randomTag}]`,
      );
    } else {
      // If course exists, ensure it has a tag for testing
      await prisma.course.update({
        where: { slug },
        data: {
          tags: {
            deleteMany: {}, // Clear existing tags to avoid duplicates/errors in this simple seed
            create: {
              tag: {
                connect: { name: randomTag },
              },
            },
          },
        },
      });
      console.log(`ℹ️ Course ${i} exists. Updated tag to: ${randomTag}`);
    }
  }

  // 4. Create Quiz
  // Find a lesson to attach quiz to
  const lesson = await prisma.lesson.findFirst({
    where: { quiz: null }, // Only find data that doesn't have a quiz
  });

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
  } else {
    console.log("ℹ️ No eligible lesson found for quiz or quiz already exists.");
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
