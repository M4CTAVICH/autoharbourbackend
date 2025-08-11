import prisma from "../config/db.js";
import { sendOTPEmail } from "../utils/sendEmail.js";
import type { CreateOTPDTO, VerifyOTPDTO, OTPResponse } from "../types/otp.js";

const generateOTPCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createAndSendOTP = async (
  data: CreateOTPDTO
): Promise<OTPResponse> => {
  try {
    await prisma.oTP.deleteMany({
      where: {
        userId: data.userId,
        type: data.type,
        isUsed: false,
      },
    });
    const otpCode = generateOTPCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otp = await prisma.oTP.create({
      data: {
        code: otpCode,
        type: data.type,
        expiresAt,
        userId: data.userId,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });
    if (!user?.email) {
      throw new Error("User email not found");
    }

    await sendOTPEmail(user.email, otpCode, data.type);

    return {
      message: "OTP send Succesfully",
      expiresAt: otp.expiresAt,
    };
  } catch (error) {
    console.error("Create OTP error", error);
    throw new Error("Failed to create and send OTP");
  }
};
export const verifyOTP = async (data: VerifyOTPDTO): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) {
      throw new Error("User not found");
    }
    const otp = await prisma.oTP.findFirst({
      where: {
        userId: user.id,
        code: data.code,
        type: data.type,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    if (!otp) {
      throw new Error("Invalid or expired OTP");
    }

    await prisma.oTP.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });
    if (data.type === "EMAIL_VERIFICATION") {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }
    return true;
  } catch (error) {
    console.error("Verify OTP error", error);
    throw new Error("OTP verification failed");
  }
};
