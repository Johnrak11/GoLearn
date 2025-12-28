# GoLearn Backend API

A robust Learning Management System (LMS) backend built with **Node.js**, **Express**, **TypeScript**, and **Prisma ORM**.

## 🚀 Features

- **User Authentication & RBAC**: Secure login with JWT, role-based access control (Student, Instructor, Admin).
- **Course Management**: Create, publish, and manage courses, modules, and lessons.
- **Learning Progress**: Track video completion, quiz scores, and generate certificates automatically.
- **Interactive Quizzes**: Auto-graded quizzes with immediate feedback.
- **Community Forum**: Threaded discussions for courses.
- **Secure Content**: Enrollment-aware content gating (only enrolled users can access lesson content).

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma (MySQL)
- **Validation**: Zod
- **Documentation**: Swagger UI

---

## ⚙️ Setup Instructions

### 1. Prerequisites

- Node.js (v18+ recommended)
- MySQL Database
- npm or yarn

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone <your-repo-url>
cd golearn
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000

# Database Connection (MySQL)
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"

# Security
JWT_SECRET="your-super-secret-key-change-this"
```

---

## 🗄️ Database Setup & Migration

### 1. Run Migrations

Apply the Prisma schema to your database:

```bash
# Push schema changes to the database
npx prisma db push

# OR create a migration file (recommended for production)
npx prisma migrate dev --name init
```

### 2. Seed the Database

Populate the database with initial data (users, courses, quizzes):

```bash
npm run seed
```

_This command runs `prisma/seed.ts` which creates admin users, instructors, and sample courses._

---

## 🏃‍♂️ Running the Project

### Development Mode

Runs the server with hot-reloading (nodemon):

```bash
npm run dev
```

### Production Build

Build the TypeScript code and run the compiled JavaScript:

```bash
npm run build
npm start
```

### API Documentation

Once the server is running, visit:
**[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

---

## 🧩 Database Structure Flow

The database is designed around these core domains:

### 1. User & Auth

- **User**: Central entity with roles (`Student`, `Instructor`, `Admin`).
- **Role/Permission**: Many-to-many relationship defining access rights.

### 2. Course Content (Hierarchical)

`Course` -> `Module` -> `Lesson`

- **Lesson Types**: Video, Text, Quiz, PDF.
- **Content**: Linked via `Video` or `Resource` tables.

### 3. Learning & Progress

- **Enrollment**: Links `User` to `Course` (tracks overall status).
- **LessonProgress**: Tracks completion of individual lessons.
- **Certificate**: Issued automatically when `Enrollment` reaches 100%.

### 4. Assessments

- **Quiz**: Attached to a `Lesson`.
- **Question/Option**: Multiple choice or true/false questions.
- **QuizAttempt**: Stores user scores and pass/fail status.

### 5. Community

- **ForumPost**: Threaded discussions linked to `Course` and `User`.
- **Review**: Ratings and comments for courses.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
