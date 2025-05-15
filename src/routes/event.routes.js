import { Router } from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../controllers/event.controller.js";
import {
  addOrUpdateReaction,
  deleteReaction,
  getUsersWhoReacted,
  getReactionsForEvent
} from "../controllers/reaction.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Create a new event
router.post(
  "/create",
  verifyJWT,
  upload.fields([{ name: "image", maxCount: 1 }]),
  createEvent
);

// Get all events (for users and admin)
router.get("/all", getAllEvents);

// Get a particular event by ID
router.get("/view/:eventId", getEventById);

// Update an event (admin only)
router.put(
  "/update/:eventId",
  verifyJWT,
  upload.fields([{ name: "image", maxCount: 1 }]),
  updateEvent
);

// Delete an event (admin only)
router.delete("/delete/:eventId", verifyJWT, deleteEvent);

// ========== Nested REACTIONS routes ========== //

// Add or update a reaction for an event
router.post("/:eventId/reactions", verifyJWT, addOrUpdateReaction);

// Delete a reaction for the current user on an event
router.delete("/:eventId/reactions", verifyJWT, deleteReaction);

// Get all reactions (or counts) for an event
router.get("/:eventId/reactions/users", getUsersWhoReacted);
router.get("/:eventId/reactions", getReactionsForEvent);



export default router;
