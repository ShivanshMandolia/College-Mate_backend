import mongoose from 'mongoose';

const lostItemRequestSchema = new mongoose.Schema({
  title: { type: String, required: true },      // Title or short summary
  name: { type: String, required: true },       // Name of lost item
  description: { type: String, required: true },// Detailed description
  category: { type: String, required: true },   // Item category
  landmark: { type: String, required: true },   // Last known location
  imageUrl: { type: String },                    // Optional image URL
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User who requested
}, {
  timestamps: true // createdAt, updatedAt auto
});

export const LostItemRequest = mongoose.model('LostItemRequest', lostItemRequestSchema);
