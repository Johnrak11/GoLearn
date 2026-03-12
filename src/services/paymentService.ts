import axios from "axios";
import prisma from "../config/prisma";

const KHQR_API_URL = process.env.KHQR_API_URL!;
const KHQR_API_KEY = process.env.KHQR_API_KEY!;
const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT ?? 20);

// ============ Initiate Payment ============
// 1. Creates an Order in DB (PENDING)
// 2. Calls external KHQR API to generate QR
// 3. Saves PaymentTransaction
// 4. Starts background polling loop (5 min)
// Returns QR data to mobile immediately
export async function initiatePaymentService(userId: string, courseId: string) {
  // Validate course
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { instructor: { select: { id: true } } },
  });
  if (!course || course.status !== "PUBLISHED") {
    return { error: "Course not found or not available" };
  }
  if (Number(course.price) === 0) {
    return { error: "This course is free — use the enroll endpoint directly" };
  }

  // Check not already enrolled
  const enrolled = await prisma.enrollment.findUnique({
    where: { user_id_course_id: { user_id: userId, course_id: courseId } },
  });
  if (enrolled) return { error: "Already enrolled" };

  const amount = Number(course.price);
  const timeStr = Date.now().toString().slice(-6);
  const courseStr = courseId.slice(0, 4);
  const orderId = `GL-${timeStr}-${courseStr}`;

  // Create Order
  const order = await prisma.order.create({
    data: {
      user_id: userId,
      total_amount: amount,
      currency: "USD",
      status: "PENDING",
      items: {
        create: [{ course_id: courseId, price: amount }],
      },
    },
  });

  // Fetch Payment Configuration
  const paymentConfig = await prisma.paymentConfiguration.findFirst();

  // Call external KHQR API
  let khqrData: {
    qr_string: string;
    md5: string;
    payment_link?: string;
    order_id?: string;
  };
  try {
    const payload: any = {
      amount,
      currency: "USD",
      orderId,
      merchant_name: paymentConfig?.merchantName || "GoLearn",
      source_info: {
        appIconUrl: "https://via.placeholder.com/150",
        appName: "GoLearn",
        appDeepLinkCallback: `golearn://payment/success?orderId=${order.id}`,
      },
    };

    if (paymentConfig?.merchantCity)
      payload.merchant_city = paymentConfig.merchantCity;
    if (paymentConfig?.telegramChatId)
      payload.telegram_chat_id = paymentConfig.telegramChatId;

    const response = await axios.post(
      `${KHQR_API_URL}/api/external/generate-qr`,
      payload,
      { headers: { "X-Api-Key": KHQR_API_KEY } },
    );
    khqrData = response.data;
  } catch (err: any) {
    console.error("--- KHQR API ERROR ---");
    console.error(err?.response?.data || err?.message || err);
    console.error("Payload sent:", JSON.stringify({ amount, orderId }));

    // Roll back order on KHQR failure
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    return { error: "Failed to generate KHQR. Please try again." };
  }

  // Save PaymentTransaction
  const tx = await prisma.paymentTransaction.create({
    data: {
      order_id: order.id,
      course_id: courseId,
      user_id: userId,
      md5: khqrData.md5,
      qr_string: khqrData.qr_string,
      payment_link: khqrData.payment_link,
      external_order_id: khqrData.order_id ?? orderId,
      status: "PENDING",
    },
  });

  // Start background polling (non-blocking)
  startPolling(
    tx.md5,
    order.id,
    courseId,
    userId,
    course.instructor.id,
    amount,
  );

  return {
    order_id: order.id,
    qr_string: khqrData.qr_string,
    payment_link: khqrData.payment_link,
    md5: khqrData.md5,
    amount,
    currency: "USD",
    expires_in: 300, // 5 minutes
  };
}

// ============ Get Payment Status ============
export async function getPaymentStatusService(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, user_id: userId },
    include: {
      items: true,
      khqr_transaction: {
        select: {
          status: true,
          qr_string: true,
          payment_link: true,
          md5: true,
        },
      },
    },
  });
  if (!order) return { error: "Order not found" };

  return {
    order_id: order.id,
    status: order.status, // PENDING | COMPLETED | FAILED
    payment_status: order.khqr_transaction?.status ?? null,
  };
}

// ============ Background Polling Loop ============
// Polls every 10s for up to 5 minutes (30 attempts)
function startPolling(
  md5: string,
  orderId: string,
  courseId: string,
  userId: string,
  instructorId: string,
  amount: number,
) {
  const MAX_ATTEMPTS = 30; // 30 × 10s = 300s = 5min
  const INTERVAL_MS = 10_000;
  let attempts = 0;

  const timer = setInterval(async () => {
    attempts++;

    // Check if already stopped (e.g., server restart)
    const tx = await prisma.paymentTransaction.findUnique({ where: { md5 } });
    if (!tx || tx.polling_stop) {
      clearInterval(timer);
      return;
    }

    try {
      const res = await axios.post(
        `${KHQR_API_URL}/api/external/check-status`,
        { md5 },
        { headers: { "X-Api-Key": KHQR_API_KEY } },
      );

      const responseCode = res.data?.responseCode;

      if (responseCode === 0) {
        // ✅ PAYMENT SUCCESS
        clearInterval(timer);
        await handlePaymentSuccess({
          md5,
          orderId,
          courseId,
          userId,
          instructorId,
          amount,
        });
        return;
      }
    } catch {
      // Network error — continue polling
    }

    // Timeout after 5 min
    if (attempts >= MAX_ATTEMPTS) {
      clearInterval(timer);
      await prisma.$transaction([
        prisma.paymentTransaction.update({
          where: { md5 },
          data: { status: "EXPIRED", polling_stop: true },
        }),
        prisma.order.update({
          where: { id: orderId },
          data: { status: "FAILED" },
        }),
      ]);
    }
  }, INTERVAL_MS);
}

// ============ On Payment Success ============
async function handlePaymentSuccess(params: {
  md5: string;
  orderId: string;
  courseId: string;
  userId: string;
  instructorId: string;
  amount: number;
}) {
  const { md5, orderId, courseId, userId, instructorId, amount } = params;

  const platformFee = Number(((amount * PLATFORM_FEE_PCT) / 100).toFixed(2));
  const netAmount = Number((amount - platformFee).toFixed(2));

  await prisma.$transaction(async (tx) => {
    // 1. Mark transaction success
    await tx.paymentTransaction.update({
      where: { md5 },
      data: { status: "SUCCESS", polling_stop: true, paid_at: new Date() },
    });

    // 2. Complete order
    await tx.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED" },
    });

    // 3. Create enrollment (idempotent)
    const enrollment = await tx.enrollment.upsert({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
      create: {
        user_id: userId,
        course_id: courseId,
        status: "ACTIVE",
        progress_pct: 0,
      },
      update: {},
    });

    // 4. Record earnings for teacher
    await tx.earningRecord.upsert({
      where: { enrollment_id: enrollment.id },
      create: {
        enrollment_id: enrollment.id,
        course_id: courseId,
        instructor_id: instructorId,
        gross_amount: amount,
        platform_fee: platformFee,
        net_amount: netAmount,
        status: "PENDING",
      },
      update: {},
    });
  });
}
