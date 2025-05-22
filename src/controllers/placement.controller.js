import { Placement } from "../models/placement.model.js";
import { PlacementRegistration } from "../models/placementreg.model.js";
import { Update } from "../models/updateplacement.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Notification from "../models/notification.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {User} from "../models/user.model.js"; // Import User model for getting admins

// 1. Superadmin creates a placement
const createPlacement = asyncHandler(async (req, res) => {
  if (!req.user?.isSuperAdmin) {
    throw new ApiError(403, "Only Superadmin can create placement");
  }

  const { companyName, jobTitle, jobDescription, eligibilityCriteria, deadline, applicationLink, assignedAdmin } = req.body;

  const placement = await Placement.create({
    companyName,
    jobTitle,
    jobDescription,
    eligibilityCriteria,
    deadline,
    applicationLink,
    assignedAdmin // Store the admin who is assigned to this placement
  });

  res.status(201).json(new ApiResponse(201, placement, "Placement created successfully"));
});

// NEW FUNCTION: Get all admins for superadmin to assign
const getAllAdmins = asyncHandler(async (req, res) => {
  if (!req.user?.isSuperAdmin) {
    throw new ApiError(403, "Only Superadmin can view all admins");
  }

  // Find all users with role "admin"
  const admins = await User.find({ role: "admin" })
    .select("_id name email") // Only select necessary fields
    .lean();

  res.status(200).json(new ApiResponse(200, admins, "All admins retrieved successfully"));
});

// New function for superadmin to assign placement to admin
const assignPlacementToAdmin = asyncHandler(async (req, res) => {
  if (!req.user?.isSuperAdmin) {
    throw new ApiError(403, "Only Superadmin can assign placements to admins");
  }

  const { placementId } = req.params;
  const { adminId } = req.body;

  if (!adminId) {
    throw new ApiError(400, "Admin ID is required");
  }

  const placement = await Placement.findById(placementId);
  if (!placement) {
    throw new ApiError(404, "Placement not found");
  }

  placement.assignedAdmin = adminId;
  await placement.save();

  res.status(200).json(new ApiResponse(200, placement, "Placement assigned to admin successfully"));
});

// 2. Add update to a placement
const addPlacementUpdate = asyncHandler(async (req, res) => {
  const { placementId } = req.params;
  const { updateText, roundType } = req.body;

  if (!updateText || updateText.trim() === "") {
    throw new ApiError(400, "Update text is required");
  }

  if (!roundType) {
    throw new ApiError(400, "RoundType is required");
  }

  const placement = await Placement.findById(placementId);
  if (!placement) {
    throw new ApiError(404, "Placement not found");
  }

  // Check if the user is authorized to add updates to this placement
  if (!req.user?.isSuperAdmin) {
    if (req.user.role !== "admin" || placement.assignedAdmin?.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You are not authorized to update this placement");
    }
  }

  const update = await Update.create({
    placement: placementId,
    updateText,
    postedBy: req.user._id,
    roundType,
  });

  await Placement.findByIdAndUpdate(placementId, {
    $push: { updates: update._id },
  });

  // ✅ Determine notification recipients based on roundType
  let notifyStudentIds = [];

  if (roundType === "common") {
    // Notify all registered students
    const registrations = await PlacementRegistration.find({ placement: placementId });
    notifyStudentIds = registrations.map((r) => r.student);
  } else if (roundType === "round-specific") {
    // Notify only shortlisted students
    notifyStudentIds = placement.selectedStudents;
  }

  const message = `A new update has been posted for the placement: ${placement.companyName}. Please check the placement details.`;

  for (const studentId of notifyStudentIds) {
    try {
      await Notification.create({ userId: studentId, message });
    } catch (error) {
      console.error(`Error sending notification to student ${studentId}: ${error.message}`);
    }
  }

  res.status(201).json(new ApiResponse(201, update, "Update added to placement"));
});

// 3. Get all placements for a student (with registrationStatus)
// Fixed getAllPlacementsForStudent function
const getAllPlacementsForStudent = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized access - user not authenticated");
  }
  
  const userId = req.user._id;
  console.log('Getting placements for user:', userId); // Debug log

  // Get all registrations for this student
  const registrations = await PlacementRegistration.find({ student: userId });
  console.log('Found registrations:', registrations); // Debug log
  
  // Create a map of placement ID to registration status
  const registrationMap = {};
  registrations.forEach(r => {
    registrationMap[r.placement.toString()] = r.status;
  });
  console.log('Registration map:', registrationMap); // Debug log

  // Get all open placements
  const placements = await Placement.find({ status: "open" });
  console.log('Found placements:', placements.length); // Debug log

  // Enrich placements with registration status
  const enrichedPlacements = placements.map(p => {
    const placement = p.toObject();
    const placementId = p._id.toString();
    
    // Set registration status based on whether student is registered or not
    placement.registrationStatus = registrationMap[placementId] || "not_registered";
    
    console.log(`Placement ${placementId}: ${placement.registrationStatus}`); // Debug log
    
    return placement;
  });

  console.log('Enriched placements:', enrichedPlacements.map(p => ({
    id: p._id,
    company: p.companyName,
    status: p.registrationStatus
  }))); // Debug log

  res.status(200).json(new ApiResponse(200, enrichedPlacements, "Student placements retrieved"));
});

// 4. Get placement details
// Updated getPlacementDetails function for your controller
const getPlacementDetails = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized access - user not authenticated");
  }
  
  const { placementId } = req.params;
  const userId = req.user._id;
  
  // Fetch placement with updates populated
  const placement = await Placement.findById(placementId)
    .populate({
      path: "updates",
      select: "updateText postedBy datePosted roundType",
      populate: {
        path: "postedBy",
        select: "name email role",
      },
      options: { sort: { datePosted: -1 } } // Sort updates by newest first
    })
    .lean();
  
  if (!placement) {
    throw new ApiError(404, "Placement not found");
  }
  
  // Check if student is registered
  const registration = await PlacementRegistration.findOne({
    placement: placementId,
    student: userId,
  });
  
  // Determine registration status
  let registrationStatus = 'not_registered';
  if (registration) {
    registrationStatus = registration.status; // This will be 'registered', 'shortlisted', or 'rejected'
  }
  
  // Check user roles and permissions
  const isSuperAdmin = req.user?.isSuperAdmin;
  const isAssignedAdmin = 
    req.user.role === "admin" && 
    placement.assignedAdmin && 
    placement.assignedAdmin.toString() === userId.toString();
  
  // Get all updates
  const updates = placement.updates || [];
  
  // Filter updates based on user status and registration
  let filteredUpdates;
  
  if (isSuperAdmin || isAssignedAdmin) {
    // Superadmins and assigned admin see all updates
    filteredUpdates = updates;
  } else if (registration) {
    // For registered students
    if (registration.status === "shortlisted") {
      // Shortlisted students see all updates
      filteredUpdates = updates;
    } else {
      // Registered but not shortlisted students see only common updates
      filteredUpdates = updates.filter(update => update.roundType === "common");
    }
  } else {
    // Non-registered students see no updates (will be handled in frontend)
    filteredUpdates = [];
  }
  
  // Enhanced debugging - remove in production
  console.log({
    userId: userId.toString(),
    userRole: req.user.role,
    isSuperAdmin,
    isAssignedAdmin,
    registrationExists: !!registration,
    registrationStatus,
    isShortlisted: registration?.status === "shortlisted",
    totalUpdates: updates.length,
    commonUpdates: updates.filter(u => u.roundType === "common").length,
    roundSpecificUpdates: updates.filter(u => u.roundType === "round-specific").length,
    filteredUpdatesCount: filteredUpdates.length,
    placementId: placementId
  });
  
  // Construct response with all necessary data
  const responseData = {
    _id: placement._id,
    companyName: placement.companyName,
    jobTitle: placement.jobTitle,
    jobDescription: placement.jobDescription,
    eligibilityCriteria: placement.eligibilityCriteria,
    deadline: placement.deadline,
    applicationLink: placement.applicationLink,
    status: placement.status,
    location: placement.location,
    salary: placement.salary,
    createdAt: placement.createdAt,
    updatedAt: placement.updatedAt,
    registrationStatus, // Include registration status in response
    updates: filteredUpdates, // Include filtered updates
    // Additional fields that might be useful
    selectedStudents: placement.selectedStudents || [],
    rejectedStudents: placement.rejectedStudents || [],
    assignedAdmin: placement.assignedAdmin
  };
  
  res.status(200).json(new ApiResponse(200, responseData, "Placement details retrieved successfully"));
});

// 5. Delete a placement
const deletePlacement = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized access - user not authenticated");
  }
  
  if (!req.user?.isSuperAdmin) {
    throw new ApiError(403, "Only Superadmin can delete placements");
  }

  const { placementId } = req.params;

  await Placement.findByIdAndDelete(placementId);

  res.status(200).json(new ApiResponse(200, null, "Placement deleted successfully"));
});

// 6. Get all placements (Admin/Superadmin)
const getAllPlacementsForAdmin = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized access - user not authenticated");
  }
  
  let placements;
  
  if (req.user?.isSuperAdmin) {
    // Superadmin sees all placements
    placements = await Placement.find().populate("updates");
  } else if (req.user.role === "admin") {
    // Admin sees only assigned placements
    placements = await Placement.find({ assignedAdmin: req.user._id }).populate("updates");
  } else {
    throw new ApiError(403, "Unauthorized - insufficient permissions");
  }

  res.status(200).json(new ApiResponse(200, placements, "Placements retrieved successfully"));
});

/// Updated updateStudentStatus function
const updateStudentStatus = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized access - user not authenticated");
  }
  
  const { studentId, status } = req.body;
  const placementId = req.params.placementId;

  if (!["shortlisted", "rejected"].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be 'shortlisted' or 'rejected'");
  }

  const placement = await Placement.findById(placementId);
  if (!placement) {
    throw new ApiError(404, "Placement not found");
  }

  // Check permissions
  if (!req.user?.isSuperAdmin) {
    if (req.user.role !== "admin" || placement.assignedAdmin?.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You are not authorized to update student status for this placement");
    }
  }

  // Update the registration with new status and tracking info
  const registration = await PlacementRegistration.findOneAndUpdate(
    { student: studentId, placement: placementId },
    {
      status,
      statusUpdatedBy: req.user._id, // Track who updated the status
      statusUpdatedAt: new Date()
    },
    { new: true, runValidators: true }
  );

  if (!registration) {
    throw new ApiError(404, "Student registration not found for this placement");
  }

  // Update the placement's selectedStudents or rejectedStudents array
  if (status === "shortlisted") {
    await Placement.findByIdAndUpdate(placementId, {
      $addToSet: { selectedStudents: studentId },
      $pull: { rejectedStudents: studentId }
    });
  } else if (status === "rejected") {
    await Placement.findByIdAndUpdate(placementId, {
      $addToSet: { rejectedStudents: studentId },
      $pull: { selectedStudents: studentId }
    });
  }

  // Send notification to student
  const message =
    status === "shortlisted"
      ? `🎉 Great news! You have been shortlisted for ${placement?.companyName || 'a placement'}`
      : `Thank you for applying to ${placement?.companyName || 'a placement'}. Unfortunately, you were not selected for this position.`;

  await Notification.create({ userId: studentId, message });

  res.status(200).json(new ApiResponse(200, registration, `Student ${status} successfully`));
});

// Updated registerForPlacement function
const registerForPlacement = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized access - user not authenticated");
  }

  const userId = req.user._id;
  const { placementId } = req.params;

  if (!placementId) {
    throw new ApiError(400, "Placement ID is required");
  }

  // Check if the placement exists and is still open
  const placement = await Placement.findById(placementId);
  if (!placement) {
    throw new ApiError(404, "Placement not found");
  }

  if (placement.status !== "open") {
    throw new ApiError(400, "This placement is no longer accepting applications");
  }

  // Check if deadline has passed
  if (new Date() > new Date(placement.deadline)) {
    throw new ApiError(400, "Application deadline has passed");
  }

  // Check if student has already registered
  const existingRegistration = await PlacementRegistration.findOne({
    student: userId,
    placement: placementId,
  });

  if (existingRegistration) {
    throw new ApiError(409, "You have already registered for this placement");
  }

  // Check resume file presence
  const resumeLocalPath = req.files?.resume?.[0]?.path;
  if (!resumeLocalPath) {
    throw new ApiError(400, "Resume file is required");
  }

  // Upload resume to Cloudinary
  const resume = await uploadOnCloudinary(resumeLocalPath);
  if (!resume?.secure_url) {
    throw new ApiError(400, "Resume upload failed");
  }

  // Check Google form link
  const googleFormLink = req.body.googleFormLink;
  if (!googleFormLink) {
    throw new ApiError(400, "Google form link is required");
  }

  // Create the registration entry with default status "registered"
  const registration = await PlacementRegistration.create({
    student: userId,
    placement: placementId,
    resumeLink: resume.secure_url,
    googleFormLink,
    status: "registered", // Explicitly set status (though it's default)
    appliedAt: new Date()
  });

  // Send confirmation notification
  await Notification.create({
    userId,
    message: `✅ Successfully registered for ${placement.companyName}. You will receive updates about the selection process.`
  });

  res.status(201).json(
    new ApiResponse(201, registration, "Successfully registered for placement")
  );
});
const getAllRegisteredStudentsForPlacement = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized access - user not authenticated");
  }

  const { placementId } = req.params;

  const placement = await Placement.findById(placementId);
  if (!placement) {
    throw new ApiError(404, "Placement not found");
  }

  const isAssignedAdmin =
    req.user.role === "admin" &&
    placement.assignedAdmin &&
    placement.assignedAdmin.equals(req.user._id);

  const isSuperAdmin =
    req.user.role === "admin" && req.user.isSuperAdmin === true;

  if (!isSuperAdmin && !isAssignedAdmin) {
    throw new ApiError(403, "You are not authorized to view registered students for this placement");
  }

  const registrations = await PlacementRegistration.find({ placement: placementId })
    .populate("student", "name email rollNumber branch year")
    .lean();

  res.status(200).json(new ApiResponse(200, registrations, "Registered students retrieved successfully"));
});


export {
  createPlacement,
  getAllAdmins, // Export the new function
  assignPlacementToAdmin,
  addPlacementUpdate,
  getAllPlacementsForStudent,
  getPlacementDetails,
  deletePlacement,
  getAllPlacementsForAdmin,
  updateStudentStatus,
  registerForPlacement,
  getAllRegisteredStudentsForPlacement
};
