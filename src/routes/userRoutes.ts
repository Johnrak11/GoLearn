import express from "express";
import {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
} from "../controllers/userController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and profile endpoints
 */

// ============ Self-Profile Routes (must be before /:id) ============

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get my profile
 *     description: Returns the authenticated user's full profile including all personal info.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 full_name:
 *                   type: string
 *                 headline:
 *                   type: string
 *                 bio:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 date_of_birth:
 *                   type: string
 *                   format: date-time
 *                 gender:
 *                   type: string
 *                   enum: [male, female, other]
 *                 skills:
 *                   type: string
 *                 address:
 *                   type: string
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authenticate, getMe);

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update my profile
 *     description: Update the authenticated user's own profile information.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 example: "+855 12 345 678"
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "2000-01-15"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               skills:
 *                 type: string
 *                 example: "JavaScript, Python, React"
 *               address:
 *                 type: string
 *                 example: "Phnom Penh, Cambodia"
 *               bio:
 *                 type: string
 *                 example: "Student at AEU"
 *               avatar_url:
 *                 type: string
 *                 format: uri
 *               headline:
 *                 type: string
 *                 example: "Computer Science Student"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch("/me", authenticate, updateMe);

// ============ Admin Routes ============

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users (Admin)
 *     description: Returns paginated list of users with search, role, and status filters.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, instructor, admin]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, BANNED, PENDING]
 *     responses:
 *       200:
 *         description: Paginated list of users
 */
router.get("/", authenticate, authorize(["admin"]), listUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID (Admin)
 *     description: Returns full user details including enrollments.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User UUID
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get("/:id", authenticate, authorize(["admin"]), getUserById);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user (Admin)
 *     description: Admin can update any user's profile, status, and roles.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *               skills:
 *                 type: string
 *               address:
 *                 type: string
 *               bio:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, BANNED, PENDING]
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [student, instructor, admin]
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 */
router.put("/:id", authenticate, authorize(["admin"]), updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user (Admin)
 *     description: Permanently deletes a user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete("/:id", authenticate, authorize(["admin"]), deleteUser);

export default router;
