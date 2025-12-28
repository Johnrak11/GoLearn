"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const passwordHash = await bcryptjs_1.default.hash('password123', 10);
    // Create Users
    const instructor = await prisma.user.upsert({
        where: { email: 'instructor@example.com' },
        update: {},
        create: {
            email: 'instructor@example.com',
            password_hash: passwordHash,
            full_name: 'John Instructor',
            role: 'instructor',
        },
    });
    const student = await prisma.user.upsert({
        where: { email: 'student@example.com' },
        update: {},
        create: {
            email: 'student@example.com',
            password_hash: passwordHash,
            full_name: 'Jane Student',
            role: 'student',
        },
    });
    console.log({ instructor, student });
    // Create Course
    const course = await prisma.course.create({
        data: {
            instructor_id: instructor.id,
            title: 'Introduction to Node.js',
            description: 'Learn Node.js from scratch.',
            price: 49.99,
            is_published: true,
            modules: {
                create: [
                    {
                        title: 'Getting Started',
                        order_index: 1,
                        lessons: {
                            create: [
                                {
                                    title: 'What is Node.js?',
                                    type: 'video',
                                    video_url: 'https://example.com/video1',
                                    duration_seconds: 600,
                                    order_index: 1,
                                },
                                {
                                    title: 'Installation',
                                    type: 'text',
                                    order_index: 2,
                                },
                            ],
                        },
                    },
                ],
            },
        },
    });
    console.log({ course });
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
