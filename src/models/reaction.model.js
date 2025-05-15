import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema({
  event:   { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
  type:    { type: String, enum: ["like", "love", "wow"], default: "like" },
  createdAt: { type: Date, default: Date.now }
});

// Enforce one reaction per user per event
reactionSchema.index({ event: 1, user: 1 }, { unique: true });

// Sync indexes in case the unique index was added after collection creation
reactionSchema.statics.syncIndexesSafe = async function() {
  try {
    await this.syncIndexes();
    console.log("✅ Reaction indexes synced");
  } catch (err) {
    console.error("❌ Reaction index sync error:", err);
  }
};

const Reaction = mongoose.model("Reaction", reactionSchema);

// Run index sync on startup
Reaction.syncIndexesSafe();

export default Reaction;
