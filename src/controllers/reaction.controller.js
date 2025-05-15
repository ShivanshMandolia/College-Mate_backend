import mongoose from "mongoose";
import Reaction from "../models/reaction.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Add or update reaction (one per user per event)
export const addOrUpdateReaction = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { type }    = req.body;
  const userId      = req.user._id;

  console.log("✋ Reaction request by user:", userId, "for event:", eventId);

  if (!["like", "love", "wow"].includes(type)) {
    throw new ApiError(400, "Reaction type must be 'like', 'love', or 'wow'");
  }

  const reaction = await Reaction.findOneAndUpdate(
    { event: eventId, user: userId },
    { type, createdAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, reaction, "Reaction added or updated successfully"));
});

// Delete reaction by event + user
export const deleteReaction = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId      = req.user._id;

  const reaction = await Reaction.findOneAndDelete({ event: eventId, user: userId });

  if (!reaction) {
    throw new ApiError(404, "Reaction not found or not owned by you");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Reaction deleted successfully"));
});

// Get counts + current user’s reaction for an event
export const getReactionsForEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new ApiError(400, "Invalid event ID");
  }

  // Aggregate counts by type
  const counts = await Reaction.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId) } },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);

  const reactionCounts = { like: 0, love: 0, wow: 0 };
  counts.forEach(item => {
    if (item._id in reactionCounts) {
      reactionCounts[item._id] = item.count;
    }
  });

  // Fetch this user’s reaction, if logged in
  let userReaction = null;
  if (req.user) {
    const r = await Reaction.findOne({ event: eventId, user: req.user._id }).select("type -_id");
    userReaction = r ? r.type : null;
  }

  return res.status(200).json(
    new ApiResponse(200, {
      counts: reactionCounts,
      total: Object.values(reactionCounts).reduce((s, c) => s + c, 0),
      userReaction
    }, "Reaction counts fetched successfully")
  );
});

// (Optional) List users who reacted, with pagination & filtering
export const getUsersWhoReacted = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { type, page = 1, limit = 10 } = req.query;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new ApiError(400, "Invalid event ID");
  }

  const match = { event: new mongoose.Types.ObjectId(eventId) };
  if (type && ["like","love","wow"].includes(type)) match.type = type;

  const skip = (parseInt(page) -1) * parseInt(limit);

  const reactions = await Reaction.find(match)
    .populate("user", "username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Reaction.countDocuments(match);

  return res.status(200).json(
    new ApiResponse(200, {
      reactions,
      pagination: {
        total,
        page:  parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }, "Users who reacted fetched successfully")
  );
});
