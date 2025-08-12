import { Router } from "express";
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  verifyPasswordResetOTP,
  resetPasswordController,
  getProfile,
  logout,
  updateProfile,
  changeUserPassword,
  updateEmail,
} from "../controller/authController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/verify-password-reset", verifyPasswordResetOTP);
router.post("/reset-password", resetPasswordController);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.put("/change-password", authenticateToken, changeUserPassword);
router.put("/update-email", authenticateToken, updateEmail);
router.post("/logout", authenticateToken, logout);

export default router;
