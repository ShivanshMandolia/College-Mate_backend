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
      const { itemId, description } = req.body; // message is now 'description'
      const userId= req.user.id;
  
      // Find the item by its ID
      const item = await FoundItem.findById(itemId);
      if (!item) {
        return next(new ApiError(404, "Item not found"));
      }
  
      // Check if the requester has already claimed the item
      const existing = await ClaimedRequest.findOne({
        userId: userId,
        itemId: itemId,
        status: { $in: ['pending', 'accepted'] }, // Prevent multiple claims in 'pending' or 'accepted' state
      });
      if (existing) {
        return next(new ApiError(400, "You have already submitted a claim for this item."));
      }
  
      // Handle file upload for proof image (if any)
      let proofImageUrl = "";
      if (req.files && Array.isArray(req.files.image) && req.files.image.length > 0) {
        const imageLocalPath = req.files.image[0].path;
        const image = await uploadOnCloudinary(imageLocalPath);
        proofImageUrl = image?.url || "";
      }
  
      // Create a claimed request
      const claim = await ClaimedRequest.create({
        userId: userId,
        itemId: itemId,
        description, // Updated from 'message' to 'description'
        proofImage: proofImageUrl,
      });
  
      // Send a notification to the item reporter (assuming 'reportedBy' is the user who reported the item)
      await sendNotification(item.foundByBy, `Your item has been claimed by ${req.user.firstName}.`);
  
      // Return success response
      return res.status(201).json(new ApiResponse(201, claim, "Claimed request submitted successfully"));
    } catch (error) {
      console.error("Error creating claimed request:", error);
      return next(new ApiError(500, "Internal server error."));
    }
  });

// Controller for getting all notifications for a user
export const getNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, notifications, 'Notifications fetched successfully'));
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
  
// Controller for handling request actions (approve/reject)
export const handleRequestAction = asyncHandler(async (req, res, next) => {
  const { itemId, action } = req.body;
  const item = await FoundItem.findById(itemId);

  if (!item) {
    return next(new ApiError(404, 'Item not found'));
  }

  if (item.status === 'found' && action === 'approve') {
    item.status = 'approved';
    await item.save();

    await sendNotification(item.reportedBy, `Your item ${item.name} has been approved!`);

    return res.status(200).json(new ApiResponse(200, item, 'Item approved successfully'));
  }

  return next(new ApiError(400, 'Action not allowed or item status is incorrect'));
});

// Controller for getting all items reported by the logged-in user
export const getMyListings = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const myListings = await FoundItem.find({ reportedBy: userId })
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, myListings, 'Your listings fetched successfully'));
});

// Controller for getting all claims submitted by the user
export const getMyRequests = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const myRequests = await ClaimedRequest.find({ claimedBy: userId })
    .populate('foundItem')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, myRequests, 'Your claimed requests fetched successfully'));
});

// Controller for updating claim status (approve/reject/pending)
export const updateClaimStatus = asyncHandler(async (req, res, next) => {
  const { claimId, status } = req.body;
  const userId = req.user.id;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return next(new ApiError(400, 'Invalid status value'));
  }

  const claim = await ClaimedRequest.findById(claimId).populate('foundItem');
  if (!claim) {
    return next(new ApiError(404, 'Claim request not found'));
  }

  const item = await FoundItem.findById(claim.foundItem);
  if (!item) {
    return next(new ApiError(404, 'Item not found'));
  }

  if (item.reportedBy.toString() !== userId) {
    return next(new ApiError(403, 'Not authorized to update this claim'));
  }

  claim.status = status;
  await claim.save();

  if (status === 'approved') {
    item.status = 'claimed';
    item.claimedBy = claim.claimedBy;
    await item.save();
  }

  await sendNotification(claim.claimedBy, `Your claim for item ${item.name} has been ${status}`);

  res.status(200).json(new ApiResponse(200, claim, `Claim ${status} successfully`));
});
