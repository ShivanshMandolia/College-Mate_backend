import { Router } from "express";
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  deleteComplaint,
  assignComplaintToAdmin, // uses params for complaintId and assignedTo
  getComplaintNotifications,
  getAdminComplaintStatus,
  getComplaintById
} from "../controllers/complaint.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import Complaint from "../models/complaint.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const router = Router();

// Create complaint (with optional image)
router.post(
  "/complaints",
  verifyJWT,
  upload.fields([{ name: "image", maxCount: 1 }]),
  createComplaint
);

// Get logged-in user's complaints
router.get("/my-complaints", verifyJWT, getMyComplaints);

// Get all complaints (admin/authority)
router.get("/all-complaints", verifyJWT, getAllComplaints);

// Get admin availability status
router.get("/admin-status", verifyJWT, getAdminComplaintStatus);

// Update complaint status (admin only)
router.post("/update-complaint-status", verifyJWT, updateComplaintStatus);

// Delete complaint
router.delete("/complaints/:complaintId", verifyJWT, deleteComplaint);

// ✅ Assign complaint to admin (updated controller using params)
router.post(
  "/assign-complaint/:complaintId/:assignedTo",
  verifyJWT,
  assignComplaintToAdmin
);

// Get complaint details by ID
router.get("/complaints/:complaintId", verifyJWT, getComplaintById);

// Get notifications for current user
router.get("/notifications", verifyJWT, getComplaintNotifications);

// Search complaints by title or category
router.get("/search-complaints", async (req, res, next) => {
  const { query } = req.query;

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

    return res.status(200).json(
      new ApiResponse(200, complaints, "Complaints searched successfully")
    );
  } catch (error) {
    return next(new ApiError(500, "Error searching complaints"));
  }
});

export default router;
