import prisma from "../config/prisma";

// ============ Teacher: Get Earnings Summary ============
export async function getMyEarningsService(instructorId: string) {
  const records = await prisma.earningRecord.findMany({
    where: { instructor_id: instructorId },
    orderBy: { created_at: "desc" },
    include: {
      instructor: { select: { full_name: true, email: true } },
    },
  });

  const summary = records.reduce(
    (acc, r) => ({
      total_gross: acc.total_gross + Number(r.gross_amount),
      total_net: acc.total_net + Number(r.net_amount),
      pending:
        r.status === "PENDING"
          ? acc.pending + Number(r.net_amount)
          : acc.pending,
      withdrawn:
        r.status === "WITHDRAWN"
          ? acc.withdrawn + Number(r.net_amount)
          : acc.withdrawn,
    }),
    { total_gross: 0, total_net: 0, pending: 0, withdrawn: 0 },
  );

  return { summary, records };
}

// ============ Teacher: Request Withdrawal ============
export async function requestWithdrawalService(params: {
  instructorId: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  note?: string;
}) {
  // Calculate available (PENDING) earnings
  const pending = await prisma.earningRecord.findMany({
    where: { instructor_id: params.instructorId, status: "PENDING" },
  });

  if (pending.length === 0) {
    return { error: "No pending earnings to withdraw" };
  }

  const totalAmount = pending.reduce((sum, r) => sum + Number(r.net_amount), 0);

  const withdrawal = await prisma.$transaction(async (tx) => {
    // Create withdrawal request
    const wr = await tx.withdrawalRequest.create({
      data: {
        instructor_id: params.instructorId,
        amount: totalAmount,
        bank_name: params.bank_name,
        account_number: params.account_number,
        account_name: params.account_name,
        note: params.note,
        status: "PENDING",
      },
    });

    // Mark earning records as REQUESTED
    await tx.earningRecord.updateMany({
      where: { instructor_id: params.instructorId, status: "PENDING" },
      data: { status: "REQUESTED" },
    });

    return wr;
  });

  return withdrawal;
}

// ============ Teacher: My Withdrawal Requests ============
export async function getMyWithdrawalsService(instructorId: string) {
  return prisma.withdrawalRequest.findMany({
    where: { instructor_id: instructorId },
    orderBy: { requested_at: "desc" },
  });
}

// ============ Admin: All Withdrawal Requests ============
export async function getAllWithdrawalsService(status?: string) {
  return prisma.withdrawalRequest.findMany({
    where: status
      ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "PAID" }
      : undefined,
    orderBy: { requested_at: "desc" },
    include: {
      instructor: {
        select: { id: true, full_name: true, email: true, avatar_url: true },
      },
    },
  });
}

// ============ Admin: Approve / Reject Withdrawal ============
export async function reviewWithdrawalService(params: {
  withdrawalId: string;
  status: "APPROVED" | "REJECTED" | "PAID";
  admin_note?: string;
}) {
  const wr = await prisma.withdrawalRequest.findUnique({
    where: { id: params.withdrawalId },
  });
  if (!wr) return { error: "Withdrawal request not found" };

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.withdrawalRequest.update({
      where: { id: params.withdrawalId },
      data: {
        status: params.status,
        admin_note: params.admin_note,
        reviewed_at: new Date(),
      },
    });

    // If marking as PAID, update earning records to WITHDRAWN
    if (params.status === "PAID") {
      await tx.earningRecord.updateMany({
        where: { instructor_id: wr.instructor_id, status: "REQUESTED" },
        data: { status: "WITHDRAWN", withdrawn_at: new Date() },
      });
    }

    // If rejected, revert to PENDING so teacher can request again
    if (params.status === "REJECTED") {
      await tx.earningRecord.updateMany({
        where: { instructor_id: wr.instructor_id, status: "REQUESTED" },
        data: { status: "PENDING" },
      });
    }

    return result;
  });

  return updated;
}
