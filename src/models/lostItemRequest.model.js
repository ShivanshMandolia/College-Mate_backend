import mongoose from 'mongoose';

const lostItemRequestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  landmark: { type: String, required: true },
  imageUrl: { type: String },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const LostItemRequest = mongoose.model('LostItemRequest', lostItemRequestSchema);
