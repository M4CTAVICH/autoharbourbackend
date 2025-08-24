import { Router } from "express";
import {
  getMyProfileController,
  getPublicProfileController,
  updateProfileController,
  changePasswordController,
  deactivateAccountController,
  getUserListingsController,
  getUserStatsController,
} from "../controller/profileController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = Router();

// Public routes
router.get("/public/:userId", getPublicProfileController);
router.get("/public/:userId/listings", getUserListingsController);
router.get("/public/:userId/stats", getUserStatsController);

// Protected routes
router.use(authenticateToken);

// User's own profile management
router.get("/me", getMyProfileController);
router.put("/me", updateProfileController);
router.put("/me/password", changePasswordController);
router.delete("/me/deactivate", deactivateAccountController);

router.get("/me/listings", (req, res, next) => {
  const userId = ((req as any).user as { userId: number })?.userId;
  if (!userId) {
    res
      .status(401)
      .json({ success: false, message: "Authentication required" });
    return;
  }
  req.params.userId = String(userId);
  getUserListingsController(req, res);
});

export default router;
