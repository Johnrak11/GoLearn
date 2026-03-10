import express from "express";
import {
  initiatePayment,
  getPaymentStatus,
} from "../controllers/paymentController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: KHQR Bakong payment endpoints
 */

/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate a KHQR payment for a course
 *     description: |
 *       Creates an order and generates a Bakong KHQR code for payment.
 *       The backend automatically polls the payment status every 10 seconds for up to 5 minutes.
 *       When payment is confirmed, the student is automatically enrolled.
 *
 *       **Mobile flow:**
 *       1. Call this endpoint → get `qr_string` and `order_id`
 *       2. Display the QR code to the user
 *       3. Poll `GET /payments/status/:orderId` every 10s
 *       4. When `status = COMPLETED` → navigate to success screen
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - course_id
 *             properties:
 *               course_id:
 *                 type: string
 *                 format: uuid
 *                 example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *     responses:
 *       201:
 *         description: KHQR generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order_id:
 *                   type: string
 *                 qr_string:
 *                   type: string
 *                   description: Raw QR string to render as QR code image
 *                 payment_link:
 *                   type: string
 *                   description: Deep link URL to open Bakong app directly
 *                 md5:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 currency:
 *                   type: string
 *                   example: USD
 *                 expires_in:
 *                   type: integer
 *                   example: 300
 *                   description: Seconds until QR expires (5 minutes)
 *       400:
 *         description: Already enrolled, free course, or course not found
 */
router.post("/initiate", authenticate, initiatePayment);

/**
 * @swagger
 * /payments/status/{orderId}:
 *   get:
 *     summary: Poll payment status (Mobile)
 *     description: |
 *       Mobile should poll this every 10 seconds after showing the QR code.
 *       Stop polling when `status` is `COMPLETED` or `FAILED`.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current payment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order_id:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [PENDING, COMPLETED, FAILED]
 *                 payment_status:
 *                   type: string
 *                   enum: [PENDING, SUCCESS, FAILED, EXPIRED]
 */
router.get("/status/:orderId", authenticate, getPaymentStatus);

export default router;
