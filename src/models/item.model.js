import mongoose from "mongoose";
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Name of the item
  description: { type: String }, // Optional description of the item
  imageUrl: { type: String }, // URL of the image of the item (optional)
  foundBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The user who found the item
  landmark: { type: String }, // Optional, location where the item was found
  status: { type: String, enum: ['found', 'claimed', 'removed'], default: 'found' }, // Current status of the item
  createdAt: { type: Date, default: Date.now }, // Date when the item was posted as found
});

export const FoundItem = mongoose.model("FoundItem", itemSchema);
