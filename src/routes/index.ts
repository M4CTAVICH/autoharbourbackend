import { Router } from "express";
import authRoutes from "./auth.js";

const router = Router();

// Mount route modules
router.use("/auth", authRoutes);

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AutoHarbour API is running",
    timestamp: new Date().toISOString(),
  });
});

// API info endpoint
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to AutoHarbour API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      listings: "/api/listings",
      messages: "/api/messages",
      admin: "/api/admin",
    },
  });
});

export default router;
