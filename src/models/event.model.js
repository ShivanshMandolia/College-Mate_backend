import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  image: String,
  createdAt: { type: Date, default: Date.now },
  date:String
});

export const Event = mongoose.model("Event", eventSchema);
