import mongoose, { Schema } from "mongoose";

const maintenanceLogSchema = new Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    action: {
      type: String,
      enum: ["created", "assigned", "status-updated", "note-added"],
      required: true,
    },
    note: {
      type: String,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const MaintenanceLog = mongoose.model(
  "MaintenanceLog",
  maintenanceLogSchema
);
