import mongoose, { Schema } from "mongoose";

const placementSchema = new Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    eligibilityCriteria: {
      type: String,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    applicationLink: {
      type: String,
      required: true,
    },
    // ✅ MISSING FIELD - Add this to your schema
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Links to the User model for assigned admin
    },
    selectedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Links to the User model for selected students
      },
    ],
    rejectedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Links to the User model for rejected students
      },
    ],
    status: {
      type: String,
      enum: ["open", "closed", "completed"],
      default: "open",
    },
    updates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Update", // Links to the updates model
      },
    ],
    // Optional: Add these fields that might be useful
    location: {
      type: String,
    },
    salary: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Placement = mongoose.model("Placement", placementSchema);
