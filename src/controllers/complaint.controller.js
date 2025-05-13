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
export const getAllComplaints = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  let complaints;

  if (user.isSuperAdmin) {
    // Superadmin sees all complaints
    complaints = await Complaint.find()
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });
  } else if (user.role === "admin") {
    // Admin sees only assigned complaints
    complaints = await Complaint.find({ assignedTo: userId })
      .populate("createdBy", "email")
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
  const userId = req.user.id;  // Ensure this references the user object in req.user
  const user = await User.findById(userId);
  // ✅ Valid statuses (match your schema enums exactly)
  const validStatuses = ["pending", "in-progress", "resolved", "rejected"];
  if (!validStatuses.includes(status)) {
    return next(new ApiError(400, "Invalid status value."));
  }

  // ✅ Fetch complaint and populate the user who raised it
  const complaint = await Complaint.findById(complaintId)
    .populate("createdBy")  // Ensure 'createdBy' is populated
    .populate("assignedTo"); // Optional: Populate assignedTo if you want to check the assigned admin
  if (!complaint) {
    return next(new ApiError(404, "Complaint not found."));
  }

  // ✅ Admins can only update their assigned complaints
  if (req.user.role === "admin"&&!user.isSuperAdmin) {
    // Ensure that only assigned complaints are updated by admins
    if (!complaint.assignedTo || complaint.assignedTo.toString() !== userId) {
      return next(new ApiError(403, "Not authorized to update this complaint."));
    }
  }

  // ✅ Allow superadmin to update any complaint without restrictions
else{
 complaint.status = status;
  await complaint.save();
}
  // ✅ Update the status
 

  // ✅ Notify the user who raised the complaint
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


// Assign complaint to admin (Only superadmin)
export const assignComplaintToAdmin = asyncHandler(async (req, res, next) => {
  const { complaintId, assignedTo } = req.body;
  const currentUser = await User.findById(req.user.id);

  if (!currentUser.isSuperAdmin) {
    return next(new ApiError(403, "Only superadmins can assign complaints."));
  }

  if (!complaintId || !assignedTo) {
    return next(new ApiError(400, "complaintId and assignedTo are required"));
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
  complaint.status = "in-progress"; // fixed typo: was "in_progress"
  await complaint.save();

  await sendNotification(
    newAdmin._id,
    `You have been assigned a complaint: "${complaint.title}".`
  );

  return res
    .status(200)
    .json(new ApiResponse(200, complaint, "Complaint assigned successfully."));
});


// Get notifications for current user
export const getComplaintNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, notifications, "Notifications fetched successfully."));
});
