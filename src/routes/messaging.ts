import { Router } from "express";
import {
  sendMessageController,
  getUserConversationsController,
  getMessagesBetweenUsersController,
  markMessagesAsReadController,
  getUnreadCountController,
  deleteMessageController,
} from "../controller/messagingController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authenticateToken);

router.post("/", sendMessageController);

router.get("/conversations", getUserConversationsController);

router.get("/user/:userId", getMessagesBetweenUsersController);

router.patch("/user/:userId/read", markMessagesAsReadController);

router.get("/unread-count", getUnreadCountController);

router.delete("/:messageId", deleteMessageController);

export default router;
