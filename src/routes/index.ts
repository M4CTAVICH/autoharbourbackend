import { Router } from "express";
import authRoutes from "./auth.js";
import categoryRoutes from "./category.js";
import listingRoutes from "./listings.js";
import favoriteRoutes from "./favorite.js";
import messageRoutes from "./messaging.js";
import uploadRoutes from "./upload.js";
import profileRoutes from "./profile.js";
import searchRoutes from "./search.js";
import adminRoutes from "./admin.js";
import reportRoutes from "./reports.js";

const router = Router();

// Mount route modules
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/listings", listingRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/messages", messageRoutes);
router.use("/upload", uploadRoutes);
router.use("/profile", profileRoutes);
router.use("/search", searchRoutes);
router.use("/admin", adminRoutes);
router.use("/reports", reportRoutes);

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
      categories: "/api/categories",
      listings: "/api/listings",
      favorites: "/api/favorites",
      messages: "/api/messages",
      upload: "/api/upload",
      profile: "/api/profile",
      search: "/api/search",
      admin: "/api/admin",
      reports: "/api/reports",
    },
  });
});

export default router;
