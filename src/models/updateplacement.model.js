import mongoose, { Schema } from "mongoose";

const updateSchema = new Schema(
  {
    placement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Placement", // Links to the Placement model
      required: true,
    },
    updateText: {
      type: String, // The content of the update
      required: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Superadmin or admin posting the update
      required: true,
    },
    datePosted: {
      type: Date,
      default: Date.now,
    },
    roundType: {
      type: String,
      enum: ["common", "round-specific"], // "common" for all students, "round-specific" for shortlisted students
      required: true,
    },
  },
  { timestamps: true }
);


export const Update = mongoose.model("Update", updateSchema);
