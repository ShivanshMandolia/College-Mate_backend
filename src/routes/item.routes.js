import { Router } from "express";
import {
  createFoundItem,
  createClaimedRequest,
  getNotifications,
  getAllFoundItems,
  handleRequestAction,
  getMyListings,
  getMyRequests,
  updateClaimStatus
} from "../controllers/lostfound.controller.js"; // Importing relevant controllers
import { verifyJWT } from "../middlewares/auth.middleware.js"; // Middleware to verify JWT for protected routes
import { upload } from "../middlewares/multer.middleware.js"; // Middleware for file uploads

const router = Router();

// Route for creating a new found item (protected route)
router.route("/found-item").post(
  verifyJWT, // Only authenticated users can create a found item
  upload.fields([{ name: "image", maxCount: 1 }]), // Handling image upload
  createFoundItem
);

// Route for creating a claimed request 
router.route("/claimed-request").post(
  verifyJWT, // Only authenticated users can create a claimed request
  upload.fields([{ name: "image", maxCount: 1 }]), // Handling image upload for proof
  createClaimedRequest
);

// Route for fetching notifications
router.route("/notifications").get(verifyJWT, getNotifications);

// Route for fetching all found items (public route)
router.route("/found-items").get(getAllFoundItems);

// Route for handling request actions (approve/reject)
router.route("/request-action").post(verifyJWT, handleRequestAction);

// Route for fetching all listings reported by the
router.route("/my-listings").get(verifyJWT, getMyListings);

// Route for fetching all claims made by th
router.route("/my-requests").get(verifyJWT, getMyRequests);

// Route for updating the claim status 
router.route("/update-claim-status").post(verifyJWT, updateClaimStatus);

export default router;
