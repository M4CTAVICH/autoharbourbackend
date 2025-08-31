import { Router } from "express";
import {
  submitReportController,
  getMyReportsController,
  getReportDetailsController,
} from "../controller/reportsController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// User report submission and management
router.post("/", submitReportController);
router.get("/my-reports", getMyReportsController);
router.get("/:reportId", getReportDetailsController);

export default router;
