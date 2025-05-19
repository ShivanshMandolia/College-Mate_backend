import mongoose, { Schema } from "mongoose";

const complaintSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
     landmark: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["hostel", "wifi", "classroom", "mess", "other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved"],
      default: "pending",
    },
    photo: {
      type: String, // Cloudinary URL for uploaded complaint photo
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin role expected
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin who assigned the complaint
      default: null,
    },
    progressNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint; 
