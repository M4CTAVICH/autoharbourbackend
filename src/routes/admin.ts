import { Router } from "express";
import {
  getDashboardController,
  getUsersController,
  getUserDetailsController,
  banUserController,
  unbanUserController,
  getReportsController,
  resolveReportController,
  getAnalyticsController,
} from "../controller/adminController.js";
import {
  authenticateToken,
  requireAdminAccess,
  logAdminAction,
} from "../middlewares/authMiddleware.js";

const router = Router();

// All admin routes require authentication
router.use(authenticateToken);

// Dashboard routes VIEW level access (Moderator+)
router.get("/dashboard", requireAdminAccess("VIEW"), getDashboardController);
router.get("/analytics", requireAdminAccess("VIEW"), getAnalyticsController);

// User management routes MANAGE level access (Admin+)
router.get("/users", requireAdminAccess("MANAGE"), getUsersController);
router.get(
  "/users/:userId",
  requireAdminAccess("MANAGE"),
  getUserDetailsController
);

router.put(
  "/users/:userId/ban",
  requireAdminAccess("MANAGE"),
  logAdminAction("BAN_USER"),
  banUserController
);

router.put(
  "/users/:userId/unban",
  requireAdminAccess("MANAGE"),
  logAdminAction("UNBAN_USER"),
  unbanUserController
);

// Reports management routes MODERATE level access (Moderator+)
router.get("/reports", requireAdminAccess("MODERATE"), getReportsController);

router.put(
  "/reports/:reportId/resolve",
  requireAdminAccess("MODERATE"),
  logAdminAction("RESOLVE_REPORT"),
  resolveReportController
);

export default router;
