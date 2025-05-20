import Complaint from "../models/complaint.model.js";
import Notification from "../models/notification.model.js";
import {User} from "../models/user.model.js"; // Required for role check
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Helper: Send notification to user
const sendNotification = async (userId, message) => {
  const notification = new Notification({ userId, message });
  await notification.save();
};

// Create a new complaint
export const createComplaint = asyncHandler(async (req, res, next) => {
  const { title, description, category, landmark } = req.body;
  const userId = req.user.id;

  if (!title || !description || !category || !landmark) {
    return next(new ApiError(400, "All fields are required."));
  }

  let imageUrl = "";
  if (req.files?.image?.length > 0) {
    const imageLocalPath = req.files.image[0].path;
    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    imageUrl = uploadedImage?.url || "";
  }

  const complaint = await Complaint.create({
    title,
    description,
    category,
    landmark,
    imageUrl,
    status: "pending",
    createdBy: userId,
  });

  return res.status(201).json(new ApiResponse(201, complaint, "Complaint submitted successfully."));
});

// Get complaints created by the logged-in user
export const getMyComplaints = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const complaints = await Complaint.find({ createdBy: userId }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, complaints, "Your complaints fetched successfully."));
});

// Get complaints - different view for admin and superadmin
// Get complaints - different view for admin and superadmin
export const getAllComplaints = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  let complaints;

  if (user.isSuperAdmin) {
    // Superadmin sees all complaints
    complaints = await Complaint.find()
      .populate("createdBy", "email")
      .populate("assignedTo", "email name") // ✅ now included
      .sort({ createdAt: -1 });
  } else if (user.role === "admin") {
    // Admin sees only assigned complaints
    complaints = await Complaint.find({ assignedTo: userId })
      .populate("createdBy", "email")
      .populate("assignedTo", "email name") // ✅ also included for admin view
      .sort({ createdAt: -1 });
  } else {
    return next(new ApiError(403, "Access denied."));
  }

  return res.status(200).json(
    new ApiResponse(200, complaints, "Complaints fetched successfully.")
  );
});



export const updateComplaintStatus = asyncHandler(async (req, res, next) => {
  const { complaintId, status } = req.body;
  const userId = req.user.id;
  const user = await User.findById(userId);

  const validStatuses = ["pending", "in-progress", "resolved", "rejected"];
  if (!validStatuses.includes(status)) {
    return next(new ApiError(400, "Invalid status value."));
  }

  const complaint = await Complaint.findById(complaintId)
    .populate("createdBy")
    .populate("assignedTo");

  if (!complaint) {
    return next(new ApiError(404, "Complaint not found."));
  }

  // SuperAdmin can update any complaint
  if (user.isSuperAdmin) {
    complaint.status = status;
  }
  // Admin can update only their assigned complaints
  else if (req.user.role === "admin") {
    if (complaint.assignedTo && complaint.assignedTo._id.toString() === userId) {
      complaint.status = status;
    } else {
      return next(new ApiError(403, "You are not authorized to update this complaint."));
    }
  } 
  // Other users cannot update status
  else {
    return next(new ApiError(403, "Only admins can update complaint status."));
  }

  await complaint.save();

  await sendNotification(
    complaint.createdBy._id,
    `Your complaint "${complaint.title}" status has been updated to "${status}".`
  );

  return res
    .status(200)
    .json(new ApiResponse(200, complaint, "Complaint status updated."));
});

// Delete complaint (only user who raised it can delete)
export const deleteComplaint = asyncHandler(async (req, res, next) => {
  const { complaintId } = req.params;
  const userId = req.user.id;

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    return next(new ApiError(404, "Complaint not found"));
  }

  if (complaint.createdBy.toString() !== userId) {
    return next(new ApiError(403, "Not authorized to delete this complaint"));
  }

  await Complaint.findByIdAndDelete(complaintId);
  return res.status(200).json(new ApiResponse(200, null, "Complaint deleted successfully"));
});




  // Assign complaint to admin (Only superadmin) - using req.params
export const assignComplaintToAdmin = asyncHandler(async (req, res, next) => {
  const { complaintId, assignedTo } = req.params;
  const currentUser = await User.findById(req.user.id);

  if (!currentUser.isSuperAdmin) {
    return next(new ApiError(403, "Only superadmins can assign complaints."));
  }

  if (!complaintId || !assignedTo) {
    return next(new ApiError(400, "complaintId and assignedTo are required in params"));
  }

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    return next(new ApiError(404, "Complaint not found"));
  }

  const newAdmin = await User.findById(assignedTo);
  if (!newAdmin || newAdmin.role !== "admin") {
    return next(new ApiError(400, "Assigned user must be a valid admin"));
  }

  complaint.assignedBy = currentUser._id;
  complaint.assignedTo = newAdmin._id;
  complaint.status = "in-progress";
  await complaint.save();

  await sendNotification(
    newAdmin._id,
    `You have been assigned a complaint: "${complaint.title}".`
  );

  return res
    .status(200)
    .json(new ApiResponse(200, complaint, "Complaint assigned successfully."));
});

export const getAdminComplaintStatus = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const currentUser = await User.findById(userId);

  if (!currentUser.isSuperAdmin) {
    return next(new ApiError(403, "Only superadmins can view admin statuses."));
  }

  const admins = await User.find({ role: "admin" });

  const statusList = await Promise.all(
    admins.map(async (admin) => {
      const currentComplaint = await Complaint.findOne({
        assignedTo: admin._id,
        status: { $ne: "resolved" }, // still pending or in-progress
      });

      return {
        adminId: admin._id,
        name: admin.name,
        email: admin.email,
        status: currentComplaint ? "busy" : "free",
        currentComplaint: currentComplaint ? {
          title: currentComplaint.title,
          status: currentComplaint.status,
          complaintId: currentComplaint._id
        } : null
      };
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, statusList, "Admin statuses fetched successfully."));
});
// Get details of a particular complaint using req.params
export const getComplaintById = asyncHandler(async (req, res, next) => {
  const { complaintId } = req.params;

  const complaint = await Complaint.findById(complaintId)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email");

  if (!complaint) {
    return next(new ApiError(404, "Complaint not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, complaint, "Complaint details fetched successfully."));
});




// Get notifications for current user
export const getComplaintNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, notifications, "Notifications fetched successfully."));
});
