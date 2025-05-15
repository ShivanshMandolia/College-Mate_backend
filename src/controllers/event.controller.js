import { Event } from "../models/event.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Create Event
export const createEvent = asyncHandler(async (req, res) => {
  const { title, description, date } = req.body;

  if (!title || !description || !date) {
    throw new ApiError(400, "All fields are required");
  }

  let imageUrl = null;
  const imageFile = req.files?.image?.[0];

  if (imageFile) {
    const cloudinaryResult = await uploadOnCloudinary(imageFile.path);
    imageUrl = cloudinaryResult?.url;
  }

  const newEvent = await Event.create({
    title,
    description,
    date,
    image: imageUrl,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newEvent, "Event created successfully"));
});

// Get All Events
export const getAllEvents = asyncHandler(async (req, res) => {
  const events = await Event.find().sort({ date: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, events, "Fetched all events successfully"));
});

// Get Event by ID
export const getEventById = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, event, "Fetched event successfully"));
});

// Update Event
export const updateEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { title, description, date } = req.body;

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  let imageUrl = event.image;
  const imageFile = req.files?.image?.[0];

  if (imageFile) {
    const cloudinaryResult = await uploadOnCloudinary(imageFile.path);
    imageUrl = cloudinaryResult?.url || imageUrl;
  }

  event.title = title || event.title;
  event.description = description || event.description;
  event.date = date || event.date;
  event.image = imageUrl;

  await event.save();

  return res
    .status(200)
    .json(new ApiResponse(200, event, "Event updated successfully"));
});

// Delete Event
export const deleteEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await Event.findByIdAndDelete(eventId);

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Event deleted successfully"));
});
