import { FoundItem } from '../models/item.model.js';
import { LostItemRequest } from '../models/lostItemRequest.model.js';
import Notification from '../models/notification.model.js';
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Helper to send notification
const sendNotification = async (userId, message) => {
  const notification = new Notification({ userId, message });
  await notification.save();
};

// 1) Create Found Item
export const createFoundItem = asyncHandler(async (req, res, next) => {
  const { title, description, category, landmark, name } = req.body;
  const userId = req.user.id;

  if (!title || !description || !category || !landmark || !name) {
    return next(new ApiError(400, "All fields are required."));
  }

  let imageUrl = "";
  if (req.files?.image?.length > 0) {
    const image = await uploadOnCloudinary(req.files.image[0].path);
    imageUrl = image?.url || "";
  }

  const newItem = await FoundItem.create({
    title,
    name,
    description,
    imageUrl,
    category,
    landmark,
    foundBy: userId,
  });

  return res.status(201).json(new ApiResponse(201, newItem, "Found item reported successfully."));
});

// 2) Create Lost Item
export const createLostItem = asyncHandler(async (req, res, next) => {
  const { title, description, category, landmark, name } = req.body;
  const userId = req.user.id;

  if (!title || !description || !category || !landmark || !name) {
    return next(new ApiError(400, "All fields are required."));
  }

  let imageUrl = "";
  if (req.files?.image?.length > 0) {
    const image = await uploadOnCloudinary(req.files.image[0].path);
    imageUrl = image?.url || "";
  }

  const newLostItem = await LostItemRequest.create({
    title,
    name,
    description,
    imageUrl,
    category,
    landmark,
    requestedBy: userId,
  });

  return res.status(201).json(new ApiResponse(201, newLostItem, "Lost item reported successfully."));
});

// 3) Get All Found Items
export const getAllFoundItems = asyncHandler(async (req, res, next) => {
  const items = await FoundItem.find()
    .populate('foundBy', 'email firstName lastName')
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, items, "Found items fetched successfully."));
});

// 4) Get All Lost Items
export const getAllLostItems = asyncHandler(async (req, res, next) => {
  const items = await LostItemRequest.find()
    .populate('requestedBy', 'email firstName lastName')
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, items, "Lost items fetched successfully."));
});

// 5) Get Detail of a Found Item
export const getFoundItemDetail = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) return next(new ApiError(400, "Found item ID is required."));

  const item = await FoundItem.findById(id).populate('foundBy', 'email firstName lastName');
  if (!item) return next(new ApiError(404, "Found item not found."));

  return res.status(200).json(new ApiResponse(200, item, "Found item details fetched."));
});

// 6) Get Detail of a Lost Item
export const getLostItemDetail = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) return next(new ApiError(400, "Lost item ID is required."));

  const item = await LostItemRequest.findById(id).populate('requestedBy', 'email firstName lastName');
  if (!item) return next(new ApiError(404, "Lost item not found."));

  return res.status(200).json(new ApiResponse(200, item, "Lost item details fetched."));
});

// 7) Delete a Found Item (only by owner)
export const deleteFoundItem = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!id) return next(new ApiError(400, "Found item ID is required."));

  const item = await FoundItem.findById(id);
  if (!item) return next(new ApiError(404, "Found item not found."));
  if (item.foundBy.toString() !== userId) return next(new ApiError(403, "Not authorized to delete this found item."));

  await item.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Found item deleted successfully."));
});

// 8) Delete a Lost Item (only by owner)
export const deleteLostItem = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!id) return next(new ApiError(400, "Lost item ID is required."));

  const item = await LostItemRequest.findById(id);
  if (!item) return next(new ApiError(404, "Lost item not found."));
  if (item.requestedBy.toString() !== userId) return next(new ApiError(403, "Not authorized to delete this lost item."));

  await item.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Lost item deleted successfully."));
});

// 9) Get My Listings (Found Items posted by user)
export const getMyFoundListings = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const listings = await FoundItem.find({ foundBy: userId }).sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, listings, "Your found item listings fetched successfully."));
});

// 10) Get My Lost Posts (Lost Items posted by user)
export const getMyLostListings = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const listings = await LostItemRequest.find({ requestedBy: userId }).sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, listings, "Your lost item listings fetched successfully."));
});
