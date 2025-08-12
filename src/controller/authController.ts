import e from "express";
import type { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  getUserProfile,
  updateUserEmail,
  updateUserProfile,
  changePassword,
} from "../services/authService.js";
import { verifyOTP } from "../services/otpService.js";
import type {
  CreateUserDTO,
  LoginDTO,
  UpdateUserDTO,
  ChangePasswordDTO,
} from "../types/user.js";
import type { VerifyOTPDTO } from "../types/otp.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUserDTO = req.body;

    if (!userData.email || !userData.password || !userData.name) {
      res.status(400).json({
        success: false,
        message: "Email, password and name are required",
      });
      return;
    }
    const result = await registerUser(userData);

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email",
      data: result,
    });
  } catch (error: any) {
    console.error("Registration error", error);
    res.status(400).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const loginData: LoginDTO = req.body;

    if (!loginData.email || !loginData.password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }
    const result = await loginUser(loginData);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error: any) {
    console.error("Login controller error", error);
    res.status(401).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code, email }: { code: string; email: string } = req.body;

    if (!code || !email) {
      res.status(400).json({
        success: false,
        message: "OTP code and email are required",
      });
      return;
    }
    const verifyData: VerifyOTPDTO = {
      code,
      email,
      type: "EMAIL_VERIFICATION",
    };
    await verifyOTP(verifyData);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error: any) {
    console.error("Verify email controller error: ", error);
    res.status(400).json({
      success: false,
      Message: error.message,
    });
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email }: { email: string } = req.body;
    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }
    const result = await requestPasswordReset(email);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Forgot password controller error", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyPasswordResetOTP = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code, email }: { code: string; email: string } = req.body;
    if (!code || !email) {
      res.status(400).json({
        success: false,
        message: "OTP code and email are required",
      });
      return;
    }
    const verifyData: VerifyOTPDTO = {
      code,
      email,
      type: "PASSWORD_RESET",
    };
    await verifyOTP(verifyData);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error: any) {
    console.error("Verify password reset OTP controller error: ", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const resetPasswordController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, newPassword }: { email: string; newPassword: string } =
      req.body;

    if (!email || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
      return;
    }

    const result = await resetPassword(email, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Reset password controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Password reset failed",
    });
  }
};

export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const user = await getUserProfile(userId);

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: user,
    });
  } catch (error: any) {
    console.error("Get profile controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to get profile",
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error: any) {
    console.error("Logout controller error:", error);
    res.status(400).json({
      success: false,
      message: "Logout failed",
    });
  }
};
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const updateData: UpdateUserDTO = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const updatedUser = await updateUserProfile(userId, updateData);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Update profile controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};
export const changeUserPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const passwordData: ChangePasswordDTO = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
      return;
    }

    const result = await changePassword(userId, passwordData);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Change password controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to change password",
    });
  }
};

export const updateEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { newEmail }: { newEmail: string } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    if (!newEmail) {
      res.status(400).json({
        success: false,
        message: "New email is required",
      });
      return;
    }

    const result = await updateUserEmail(userId, newEmail);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Update email controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update email",
    });
  }
};
