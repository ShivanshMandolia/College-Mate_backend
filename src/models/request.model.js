import mongoose from "mongoose";
const requestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The user making the request
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', required: true }, // The item being requested
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, // Status of the request
  proofImage: { type: String }, // URL of the uploaded proof image (can be stored in a cloud storage service)
  description: { type: String }, // A description or message explaining why the user is requesting the item
  createdAt: { type: Date, default: Date.now } // Timestamp of when the request was made
});

// request.model.js
export const ClaimedRequest = mongoose.model("ClaimedRequest", requestSchema);
