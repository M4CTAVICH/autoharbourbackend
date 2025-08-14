import { Router } from "express";
import {
  createListingController,
  getListingsController,
  getListingController,
  updateListingController,
  deleteListingController,
  updateListingStatusController,
  getMyListingsController,
} from "../controller/listingsController.js";
import {
  authenticateToken,
  requireEmailVerification,
  optionalAuth,
} from "../middlewares/authMiddleware.js";

const router = Router();

// Public routes
router.get("/", optionalAuth, getListingsController);
router.get("/:id", optionalAuth, getListingController);

// Protected routes
router.post(
  "/",
  authenticateToken,
  requireEmailVerification,
  createListingController
);
router.put(
  "/:id",
  authenticateToken,
  requireEmailVerification,
  updateListingController
);
router.delete(
  "/:id",
  authenticateToken,
  requireEmailVerification,
  deleteListingController
);
router.patch(
  "/:id/status",
  authenticateToken,
  requireEmailVerification,
  updateListingStatusController
);

router.get(
  "/user/my-listings",
  authenticateToken,
  requireEmailVerification,
  getMyListingsController
);

export default router;
