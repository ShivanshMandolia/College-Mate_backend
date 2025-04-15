import { FoundItem } from '../models/item.model.js';
import { ClaimedRequest } from '../models/request.model.js';
import Notification from '../models/notification.model.js';
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Helper function to send notifications
const sendNotification = async (userId, message) => {
  const notification = new Notification({
    userId,
    message,
  });
  await notification.save();
};

// Controller for creating a found item
export const createFoundItem = asyncHandler(async (req, res, next) => {
    try {
      const { title, description, category, landmark, name } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!title || !description || !category || !landmark || !name) {
        return next(new ApiError(400, "All fields are required."));
      }

      // Handle image upload if present
      let imageLocalPath;
      if (req.files && Array.isArray(req.files.image) && req.files.image.length > 0) {
        imageLocalPath = req.files.image[0].path;
      }

      // Upload image to Cloudinary
      const image = await uploadOnCloudinary(imageLocalPath);

      // Create a new found item in the database
      const newItem = await FoundItem.create({
        title,
        name,
        description,
        imageUrl: image?.url || "",
        category,
        landmark,
        foundBy: userId,
      });

      // Return success response
      return res.status(201).json(new ApiResponse(201, newItem, "Found item reported successfully."));
    } catch (error) {
      console.error("Error creating found item:", error);
      return next(new ApiError(500, "Internal server error."));
    }
});

// Controller for creating a claimed request for a found item
export const createClaimedRequest = asyncHandler(async (req, res, next) => {
  try {
    const { itemId, description } = req.body;
    const userId = req.user.id;

    console.log("Incoming claim request for item:", itemId);
    console.log("Claiming user ID:", userId);

    const item = await FoundItem.findById(itemId);
    if (!item) {
      console.log("Item not found in DB");
      return next(new ApiError(404, "Item not found"));
    }

    const existing = await ClaimedRequest.findOne({
      userId: userId,
      itemId: itemId,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existing) {
      console.log("Duplicate claim found for this user and item");
      return next(new ApiError(400, "You have already submitted a claim for this item."));
    }

    let proofImageUrl = "";
    if (req.files && Array.isArray(req.files.image) && req.files.image.length > 0) {
      console.log("Uploading proof image to Cloudinary...");
      const imageLocalPath = req.files.image[0].path;
      const image = await uploadOnCloudinary(imageLocalPath);
      proofImageUrl = image?.url || "";
      console.log("Uploaded proof image URL:", proofImageUrl);
    }

    const claim = await ClaimedRequest.create({
      userId: userId,
      itemId: itemId,
      description,
      proofImage: proofImageUrl,
    });

    console.log("Claimed request created:", claim);

    // Debug user data before sending notification
    console.log("User Info for Notification:", req.user);
    console.log("Item reported by user ID:", item.foundBy);

    // Safe notification sending
    try {
      await sendNotification(
        item.foundBy,
        `Your item has been claimed by ${req.user.firstName || "Someone"}.`
      );
      console.log("Notification sent successfully");
    } catch (notifError) {
      console.error("Error sending notification:", notifError);
    }

    return res
      .status(201)
      .json(new ApiResponse(201, claim, "Claimed request submitted successfully"));

  } catch (error) {
    console.error("Error creating claimed request:", error);
    return next(new ApiError(500, "Internal server error."));
  }
});
// POST controller to get all claims for an item reported by the logged-in user
export const getClaimsForMyItem = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { itemId } = req.body;

  if (!itemId) {
    return next(new ApiError(400, 'Item ID is required'));
  }

  // Check if the item exists and was posted by this user
  const item = await FoundItem.findById(itemId);
  if (!item) {
    return next(new ApiError(404, 'Item not found'));
  }

  if (item.foundBy.toString() !== userId) {
    return next(new ApiError(403, 'Not authorized to view claims for this item'));
  }

  // Get all claims for this item
  const claims = await ClaimedRequest.find({ itemId })
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, claims, 'Claims for your item fetched successfully')
  );
});

export const getAllFoundItems = asyncHandler(async (req, res, next) => {
    try {
      const foundItems = await FoundItem.find()
        .populate('foundBy', 'email') // Populate user information
        .select('title name description landmark image status createdAt') // Select necessary fields
        .sort({ createdAt: -1 });
  
      return res.status(200).json(new ApiResponse(200, foundItems, 'Found items fetched successfully'));
    } catch (error) {
      console.error('Error fetching found items:', error);
      return next(new ApiError(500, 'Internal server error.'));
    }
  });
  export const getNotifications = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
  
    res.status(200).json(new ApiResponse(200, notifications, 'Notifications fetched successfully'));
  });
  
// Controller for handling request actions (approve/reject)

// Controller for getting all items reported by the logged-in user
export const getMyListings = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const myListings = await FoundItem.find({ foundBy: userId })
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, myListings, 'Your listings fetched successfully'));
});

// Controller for getting all claims submitted by the user
export const getMyRequests = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  console.log("Fetching requests for user ID:", userId);

  const myRequests = await ClaimedRequest.find({ userId: userId })
    .populate('itemId') // or whatever your ref is for the item
    .sort({ createdAt: -1 });

  console.log("Found requests:", myRequests.length);

  res.status(200).json(new ApiResponse(200, myRequests, 'Your claimed requests fetched successfully'));
});

// Controller for updating claim status (approve/reject/pending)
// Controller to handle claim approval/rejection for an item
export const updateClaimStatus = asyncHandler(async (req, res, next) => {
  const { itemId, userId, status } = req.body;
  const loggedInUserId = req.user.id;

  if (!['approved', 'rejected'].includes(status)) {
    return next(new ApiError(400, 'Invalid status value'));
  }

  const claim = await ClaimedRequest.findOne({ userId, itemId })
    .populate('userId')
    .populate('itemId');

  if (!claim) {
    return next(new ApiError(404, 'Claim request not found'));
  }

  // Ensure only the original item reporter can update the claim
  if (claim.itemId.foundBy.toString() !== loggedInUserId) {
    return next(new ApiError(403, 'Not authorized to approve/reject claims for this item'));
  }

  // Update claim status
  claim.status = status;
  await claim.save();

  const item = await FoundItem.findById(itemId);
  if (!item) {
    return next(new ApiError(404, 'Item not found'));
  }

  // If approved, mark item as claimed and notify others
  if (status === 'approved') {
    item.status = 'claimed';
    item.claimedBy = userId;
    await item.save();

    // Reject all other claims automatically
    const otherClaims = await ClaimedRequest.find({
      itemId,
      _id: { $ne: claim._id },
      status: 'pending'
    });

    for (const otherClaim of otherClaims) {
      otherClaim.status = 'rejected';
      await otherClaim.save();

      await sendNotification(
        otherClaim.userId,
        `Your claim for item "${item.name}" has been rejected because it was already claimed by someone else.`
      );
    }
  }

  // Notify the claiming user about their status
  await sendNotification(
    claim.userId._id,
    `Your claim for item "${item.name}" has been ${status}.`
  );

  return res.status(200).json(
    new ApiResponse(200, claim, `Claim ${status} successfully for item "${item.name}".`)
  );
});

