import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import { generateToken } from "../utils/jwt.js";
import { createAndSendOTP } from "./otpService.js";
import type {
  CreateUserDTO,
  LoginDTO,
  UserResponse,
  JWTPayload,
} from "../types/user.js";

export const registerUser = async (
  userData: CreateUserDTO
): Promise<{ user: UserResponse; token: string }> => {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        isVerified: false,
      },
    });

    await createAndSendOTP({
      userId: user.id,
      type: "EMAIL_VERIFICATION",
    });

    const tokenPayload: JWTPayload = {
      userId: user.id,
      email: user.email ?? "",
      role: user.role,
    };
    const token = generateToken(tokenPayload);

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email ?? "",
      name: user.name,
      avatar: user.avatar ?? "",
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };

    return { user: userResponse, token };
  } catch (error) {
    console.error("Register user error:", error);
    throw error;
  }
};

export const loginUser = async (
  loginData: LoginDTO
): Promise<{ user: UserResponse; token: string }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: loginData.email },
    });
    if (!user) {
      throw new Error("invalid email or password");
    }
    if (!user.isActive) {
      throw new Error("Account has been deactivated");
    }
    const isPasswordValid = await bcrypt.compare(
      loginData.password,
      user.password
    );
    if (!isPasswordValid) {
      throw new Error("invalid email or password");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date() },
    });
    const tokenPayload: JWTPayload = {
      userId: user.id,
      email: user.email ?? "",
      role: user.role,
    };
    const token = generateToken(tokenPayload);

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email ?? "",
      name: user.name,
      avatar: user.avatar ?? "",
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
    return { user: userResponse, token };
  } catch (error) {
    console.error("Login user error", error);
    throw error;
  }
};

export const requestPasswordReset = async (
  email: string
): Promise<{ message: string }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new Error("User does not exist");
    }
    await createAndSendOTP({
      userId: user.id,
      type: "PASSWORD_RESET",
    });
    return { message: "Password resetOTP sent to your email" };
  } catch (error) {
    console.error("Request password reset error", error);
    throw error;
  }
};
export const resetPassword = async (
  email: string,
  newPassword: string
): Promise<{ message: string }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new Error("User does not exist");
    }
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    return { message: "Password reset successfully" };
  } catch (error) {
    console.error("Reset password error", error);
    throw error;
  }
};

export const getUserProfile = async (userId: number): Promise<UserResponse> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User not found");
    }
    return {
      id: user.id,
      email: user.email ?? "",
      name: user.name,
      avatar: user.avatar ?? "",
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  } catch (error) {
    console.error("Get user profile error:", error);
    throw error;
  }
};
