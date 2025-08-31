import { Router } from "express";
import {
  getUserNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  getNotificationSettingsController,
  updateNotificationSettingsController,
  getNotificationCountController,
} from "../controller/notificationController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Notification routes
router.get("/", getUserNotificationsController);
router.get("/count", getNotificationCountController);
router.put("/:id/read", markNotificationAsReadController);
router.put("/read-all", markAllNotificationsAsReadController);

// Settings routes
router.get("/settings", getNotificationSettingsController);
router.put("/settings", updateNotificationSettingsController);

export default router;
