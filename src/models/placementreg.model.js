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
      enum: ["registered", "shortlisted", "rejected"],
      default: "registered", // ✅ FIXED: Changed from "rejected" to "registered"
    },
    // Optional: Add additional fields for better tracking
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    statusUpdatedAt: {
      type: Date,
    },
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Track which admin updated the status
    },
    // Optional: Store additional application data
    additionalDocuments: [{
      name: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    notes: {
      type: String, // For admin notes about the application
    }
  },
  { timestamps: true }
);

// Add compound index to prevent duplicate registrations
registrationSchema.index({ student: 1, placement: 1 }, { unique: true });

// Add middleware to update statusUpdatedAt when status changes
registrationSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusUpdatedAt = new Date();
  }
  next();
});

export const PlacementRegistration = mongoose.model(
  "PlacementRegistration",
  registrationSchema
);
