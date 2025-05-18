import { Router } from "express";
import {
  createFoundItem,
  createClaimedRequest,
  getNotifications,
  getAllFoundItems,
  getMyListings,
  getMyRequests,
  updateClaimStatus,
  getClaimsForMyItem,
  getMyLostRequests,
  getAllLostRequests,
  createLostItemRequest,
  getFoundItemById,
  getLostItemRequestById,
  getClaimRequestById
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

// Route for getting details of a specific found item
router.route("/found-item/:itemId").get(getFoundItemById);

// Route for handling request actions (approve/reject)
// Route for fetching all listings reported by the logged-in user
router.route("/my-listings").get(verifyJWT, getMyListings);

// Route for fetching all claims made by the logged-in user
router.route("/my-requests").get(verifyJWT, getMyRequests);

// Route for updating the claim status 
router.route("/update-claim-status").post(verifyJWT, updateClaimStatus);

// Route for getting claims for a specific item
router.route('/claims').post(verifyJWT, getClaimsForMyItem);

// Route for getting details of a specific claim request
router.route("/claim/:claimId").get(verifyJWT, getClaimRequestById);

// Route for creating a lost item request
router.post('/request', verifyJWT, upload.fields([{ name: 'image', maxCount: 1 }]), createLostItemRequest);

// Route for getting all lost item requests
router.get('/requests', verifyJWT, getAllLostRequests);

// Route for getting lost item requests by the logged-in user
router.get('/my-lost-requests', verifyJWT, getMyLostRequests);

// Route for getting details of a specific lost item request
router.route("/lost-request/:requestId").get(getLostItemRequestById);

export default router;
