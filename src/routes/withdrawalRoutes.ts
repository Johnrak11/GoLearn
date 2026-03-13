import express from "express";
import {
  getMyEarnings,
  requestWithdrawal,
  getMyWithdrawals,
  getAllWithdrawals,
  reviewWithdrawal,
  saveKHQRConfig,
  getKHQRConfig,
  getWithdrawalKHQR,
} from "../controllers/withdrawalController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Withdrawals
 *   description: Teacher earnings and withdrawal request management
 */

/**
 * @swagger
 * /withdrawals/earnings:
 *   get:
 *     summary: Get my earnings summary (Instructor)
 *     description: Returns total earnings, pending payout, and per-enrollment earning records.
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_gross:
 *                       type: number
 *                     total_net:
 *                       type: number
 *                     pending:
 *                       type: number
 *                       description: Amount available for withdrawal
 *                     withdrawn:
 *                       type: number
 *                 records:
 *                   type: array
 */
router.get(
  "/earnings",
  authenticate,
  authorize(["instructor", "admin"]),
  getMyEarnings,
);

/**
 * @swagger
 * /withdrawals/request:
 *   post:
 *     summary: Request withdrawal of all pending earnings (Instructor)
 *     description: |
 *       Bundles all PENDING earnings into a withdrawal request sent to admin.
 *       Admin reviews and manually transfers the money.
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bank_name:
 *                 type: string
 *                 example: "ABA Bank"
 *               account_number:
 *                 type: string
 *                 example: "000123456"
 *               account_name:
 *                 type: string
 *                 example: "John Doe"
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Withdrawal request created
 *       400:
 *         description: No pending earnings
 */
router.post(
  "/request",
  authenticate,
  authorize(["instructor", "admin"]),
  requestWithdrawal,
);

/**
 * @swagger
 * /withdrawals/my:
 *   get:
 *     summary: My withdrawal request history (Instructor)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of withdrawal requests
 */
router.get(
  "/my",
  authenticate,
  authorize(["instructor", "admin"]),
  getMyWithdrawals,
);

/**
 * @swagger
 * /withdrawals:
 *   get:
 *     summary: List all withdrawal requests (Admin)
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, PAID]
 *     responses:
 *       200:
 *         description: All withdrawal requests with instructor info
 */
router.get("/", authenticate, authorize(["admin"]), getAllWithdrawals);

/**
 * @swagger
 * /withdrawals/{id}:
 *   patch:
 *     summary: Approve, reject, or mark as paid (Admin)
 *     description: |
 *       - APPROVED → notifies teacher
 *       - REJECTED → earnings reverted to PENDING (teacher can re-request)
 *       - PAID → marks earnings as WITHDRAWN (final state)
 *     tags: [Withdrawals]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, PAID]
 *               admin_note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal request updated
 */
router.patch("/:id", authenticate, authorize(["admin"]), reviewWithdrawal);

/**
 * @swagger
 * /withdrawals/khqr-config:
 *   get:
 *     summary: Get instructor KHQR configuration
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KHQR configuration data
 *   post:
 *     summary: Save instructor KHQR configuration
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bakong_account_id
 *               - merchant_name
 *             properties:
 *               bakong_account_id:
 *                 type: string
 *               merchant_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configuration saved
 */
router.get(
  "/khqr-config",
  authenticate,
  authorize(["instructor", "admin"]),
  getKHQRConfig,
);
router.post(
  "/khqr-config",
  authenticate,
  authorize(["instructor", "admin"]),
  saveKHQRConfig,
);

/**
 * @swagger
 * /withdrawals/{id}/khqr:
 *   get:
 *     summary: Generate KHQR for teacher withdrawal (Admin)
 *     tags: [Withdrawals]
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
 *         description: KHQR data
 */
router.get("/:id/khqr", authenticate, authorize(["admin"]), getWithdrawalKHQR);

export default router;
