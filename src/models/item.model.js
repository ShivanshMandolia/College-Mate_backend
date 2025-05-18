import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Name of the item
  description: { type: String }, // Optional description
  imageUrl: { type: String }, // Optional image URL
  foundBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User who found the item
  landmark: { type: String }, // Location found
  status: { type: String, enum: ['found', 'claimed', 'removed'], default: 'found' }, // Status of item
  createdAt: { type: Date, default: Date.now },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User who claimed it, optional
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

export const FoundItem = mongoose.model("FoundItem", itemSchema);
