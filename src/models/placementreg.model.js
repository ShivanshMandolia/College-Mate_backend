import mongoose, { Schema } from "mongoose";

const registrationSchema = new Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Links to the User model for the student
      required: true,
    },
    placement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Placement", // Links to the Placement model
      required: true,
    },
    googleFormLink: {
      type: String, // Store the Google Form link that the student will use to apply
      required: true,
    },
    resumeLink: {
      type: String, // Store the link to the student's uploaded resume
      required: true,
    },
    status: {
      type: String,
      enum: [ "shortlisted", "rejected"],
      default: "rejected", // Can be "shortlisted" or "rejected" as well
    },
  },
  { timestamps: true }
);

export const PlacementRegistration = mongoose.model(
  "PlacementRegistration",
  registrationSchema
);
