import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import { generateToken } from "../utils/jwt.js";
import { createAndSendOTP } from "./otpService.js";
import type {
  CreateUserDTO,
  LoginDTO,
  UserResponse,
  JWTPayload,
  UpdateUserDTO,
  ChangePasswordDTO,
} from "../types/user.js";
import type { User } from "@prisma/client";

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
export const updateUserProfile = async (
  userId: number,
  updateData: UpdateUserDTO
): Promise<UserResponse> => {
  try {
    if (!updateData.name && !updateData.avatar) {
      throw new Error("No valid fields to update");
    }
    const dataToUpdate: any = {};
    if (updateData.name) dataToUpdate.name = updateData.name;
    if (updateData.avatar) dataToUpdate.avatar = updateData.avatar;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });
    const userResponse: UserResponse = {
      id: updatedUser.id,
      email: updatedUser.email ?? "",
      name: updatedUser.name,
      avatar: updatedUser.avatar ?? "",
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      createdAt: updatedUser.createdAt,
    };
    return userResponse;
  } catch (error) {
    console.error("Update user profile error", error);
    throw error;
  }
};

export const changePassword = async (
  userId: number,
  passwordData: ChangePasswordDTO
): Promise<{ message: string }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User not found");
    }
    const isCurrentPasswordValid = await bcrypt.compare(
      passwordData.currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }
    if (passwordData.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(
      passwordData.newPassword,
      saltRounds
    );

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: "Password changed successfully" };
  } catch (error) {
    console.error("Change password error:", error);
    throw error;
  }
};

export const updateUserEmail = async (
  userId: number,
  newEmail: string
): Promise<{ message: string }> => {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });
    if (existingUser && existingUser.id !== userId) {
      throw new Error("Email already in use by another account");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail, isVerified: false },
    });

    await createAndSendOTP({
      userId,
      type: "EMAIL_VERIFICATION",
    });
    return {
      message: "Email updated successfully. Please verify your new email ",
    };
  } catch (error) {
    console.error("Update email error", error);
    throw error;
  }
};
