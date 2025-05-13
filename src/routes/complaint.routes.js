import { Router } from "express";
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  deleteComplaint,
  assignComplaintToAdmin,
  getComplaintNotifications
} from "../controllers/complaint.controller.js"; // Importing relevant controllers
import { verifyJWT } from "../middlewares/auth.middleware.js"; // Middleware to verify JWT for protected routes
import { upload } from "../middlewares/multer.middleware.js"; // Middleware for file uploads
import Complaint from "../models/complaint.model.js";

const router = Router();

// Route for creating a new complaint (protected route)
router.route("/complaints").post(
  verifyJWT, // Only authenticated users can create a complaint
  upload.fields([{ name: "image", maxCount: 1 }]), // Handling image upload for complaints
  createComplaint
);

// Route for getting all complaints created by the logged-in user (protected route)
router.route("/my-complaints").get(verifyJWT, getMyComplaints);

// Route for fetching all complaints (admin/authority)
router.route("/all-complaints").get(verifyJWT, getAllComplaints);

// Route for updating the status of a complaint (admin/authority)
router.route("/update-complaint-status").post(verifyJWT, updateComplaintStatus);

// Route for deleting a complaint (protected route)
router.route("/complaints/:complaintId").delete(verifyJWT, deleteComplaint);

// Route for assigning a complaint to an admin (admin/authority)
router.route("/assign-complaint").post(verifyJWT, assignComplaintToAdmin);

// Route for fetching notifications for a user (protected route)
router.route("/notifications").get(verifyJWT, getComplaintNotifications);

// Route for searching complaints (optional: could be a public or protected route)
router.route("/search-complaints").get(async (req, res, next) => {
  const { query } = req.query; // Query parameter for searching complaints (e.g., title, category)

  if (!query) {
    return next(new ApiError(400, "Query parameter is required"));
  }

  try {
    const complaints = await Complaint.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } }
      ]
    }).sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, complaints, "Complaints searched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Error searching complaints"));
  }
});

export default router;
