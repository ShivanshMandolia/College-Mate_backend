import { FoundItem } from '../models/item.model.js';
import { ClaimedRequest } from '../models/request.model.js';
import { LostItemRequest } from '../models/lostItemRequest.model.js';
import Notification from '../models/notification.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

// 1. Create Found Item with image upload
export const createFoundItem = asyncHandler(async (req, res, next) => {
  const { title, description, category, landmark, name } = req.body;
  if (!title || !description || !category || !landmark || !name) {
    return next(new ApiError(400, "All fields are required."));
  }
  let imageUrl = "";
  if (req.files?.image?.length) {
    const uploaded = await uploadOnCloudinary(req.files.image[0].path);
    imageUrl = uploaded?.url || "";
  }
  const newItem = await FoundItem.create({
    title, name, description, category, landmark, imageUrl, foundBy: req.user.id,
  });
  res.status(201).json(new ApiResponse(201, newItem, "Found item reported successfully."));
});

// 2. Create Claimed Request with optional proof image upload
export const createClaimedRequest = asyncHandler(async (req, res, next) => {
  const { itemId, description } = req.body;
  const userId = req.user.id;
  const item = await FoundItem.findById(itemId);
  if (!item) return next(new ApiError(404, "Item not found"));
  const existingClaim = await ClaimedRequest.findOne({
    userId, itemId, status: { $in: ['pending', 'accepted'] }
  });
  if (existingClaim) return next(new ApiError(400, "Claim already submitted."));
  let proofImage = "";
  if (req.files?.image?.length) {
    const uploaded = await uploadOnCloudinary(req.files.image[0].path);
    proofImage = uploaded?.url || "";
  }
  const claim = await ClaimedRequest.create({ userId, itemId, description, proofImage });
  // Notify item owner
  await new Notification({ userId: item.foundBy, message: `Your item has been claimed by ${req.user.firstName || 'Someone'}.` }).save();
  res.status(201).json(new ApiResponse(201, claim, "Claimed request submitted successfully"));
});

// 3. Get all claims for an item posted by logged-in user
export const getClaimsForMyItem = asyncHandler(async (req, res, next) => {
  const { itemId } = req.body;
  if (!itemId) return next(new ApiError(400, "Item ID is required"));
  const item = await FoundItem.findById(itemId);
  if (!item) return next(new ApiError(404, "Item not found"));
  if (item.foundBy.toString() !== req.user.id) return next(new ApiError(403, "Not authorized"));
  const claims = await ClaimedRequest.find({ itemId }).populate('userId', 'firstName lastName email').sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, claims, "Claims fetched successfully"));
});

// 4. Get all found items (with minimal user info)
export const getAllFoundItems = asyncHandler(async (req, res) => {
  const items = await FoundItem.find()
    .populate('foundBy', 'email')
    .select('title name description landmark imageUrl status createdAt')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, items, "Found items fetched successfully"));
});

// 5. Get notifications for logged-in user
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, notifications, "Notifications fetched successfully"));
});

// 6. Get logged-in user’s found item listings
export const getMyListings = asyncHandler(async (req, res) => {
  const listings = await FoundItem.find({ foundBy: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, listings, "Your listings fetched successfully"));
});

// 7. Get logged-in user’s claimed requests
export const getMyRequests = asyncHandler(async (req, res) => {
  const requests = await ClaimedRequest.find({ userId: req.user.id })
    .populate('itemId')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, requests, "Your claimed requests fetched successfully"));
});

// 8. Update claim status (approve/reject)
export const updateClaimStatus = asyncHandler(async (req, res, next) => {
  const { itemId, userId, status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return next(new ApiError(400, "Invalid status"));
  const claim = await ClaimedRequest.findOne({ itemId, userId }).populate('itemId');
  if (!claim) return next(new ApiError(404, "Claim not found"));
  if (claim.itemId.foundBy.toString() !== req.user.id) return next(new ApiError(403, "Not authorized"));
  claim.status = status;
  await claim.save();
  if (status === 'approved') {
    const item = await FoundItem.findById(itemId);
    item.status = 'claimed';
    item.claimedBy = userId;
    await item.save();
    const otherClaims = await ClaimedRequest.find({ itemId, _id: { $ne: claim._id }, status: 'pending' });
    for (const otherClaim of otherClaims) {
      otherClaim.status = 'rejected';
      await otherClaim.save();
      await new Notification({
        userId: otherClaim.userId,
        message: `Your claim for item "${item.name}" was rejected because it was already claimed.`,
      }).save();
    }
  }
  await new Notification({
    userId,
    message: `Your claim for item "${claim.itemId.name}" has been ${status}.`
  }).save();
  res.status(200).json(new ApiResponse(200, claim, `Claim ${status} successfully`));
});

// 9. Create Lost Item Request with optional image upload
export const createLostItemRequest = asyncHandler(async (req, res, next) => {
  const { title, description, category, landmark, name } = req.body;
  if (!title || !description || !category || !landmark || !name) return next(new ApiError(400, "All fields required"));
  let imageUrl = "";
  if (req.files?.image?.length) {
    const uploaded = await uploadOnCloudinary(req.files.image[0].path);
    imageUrl = uploaded?.url || "";
  }
  const lostRequest = await LostItemRequest.create({
    title, name, description, category, landmark, imageUrl, requestedBy: req.user.id,
  });
  res.status(201).json(new ApiResponse(201, lostRequest, "Lost item request submitted successfully"));
});

// 10. Get logged-in user’s lost item requests
export const getMyLostRequests = asyncHandler(async (req, res) => {
  const lostRequests = await LostItemRequest.find({ requestedBy: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, lostRequests, "Your lost item requests fetched successfully"));
});
