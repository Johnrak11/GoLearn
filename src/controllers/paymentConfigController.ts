import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getPaymentConfig = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    let config = await prisma.paymentConfiguration.findFirst();

    if (!config) {
      config = await prisma.paymentConfiguration.create({
        data: {
          id: 1,
          bakongAccountId: "vorak_yun@bkrt",
          merchantName: "Golearn",
          merchantCity: "Phnom Penh",
          telegramChatId: "-5146921694",
        },
      });
    }

    res.status(200).json(config);
  } catch (error) {
    console.error("Error fetching payment config:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePaymentConfig = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { bakongAccountId, merchantName, merchantCity, telegramChatId } =
      req.body;

    const config = await prisma.paymentConfiguration.upsert({
      where: { id: 1 },
      update: {
        bakongAccountId,
        merchantName,
        merchantCity,
        telegramChatId,
      },
      create: {
        id: 1,
        bakongAccountId,
        merchantName,
        merchantCity,
        telegramChatId,
      },
    });

    res
      .status(200)
      .json({ message: "Payment configuration updated successfully", config });
  } catch (error) {
    console.error("Error updating payment config:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
