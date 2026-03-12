import express from "express";
import {
  getPaymentConfig,
  updatePaymentConfig,
} from "../controllers/paymentConfigController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AdminPaymentConfig
 *   description: Admin Payment Configuration management
 */

/**
 * @swagger
 * /api/admin/payment-config:
 *   get:
 *     summary: Retrieve Bakong payment configuration
 *     tags: [AdminPaymentConfig]
 *     responses:
 *       200:
 *         description: The payment configuration object
 */
router.get("/", getPaymentConfig);

/**
 * @swagger
 * /api/admin/payment-config:
 *   put:
 *     summary: Update Bakong payment configuration
 *     tags: [AdminPaymentConfig]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bakongAccountId:
 *                 type: string
 *               merchantName:
 *                 type: string
 *               merchantCity:
 *                 type: string
 *               telegramChatId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment configuration updated successfully
 */
router.put("/", updatePaymentConfig);

export default router;
