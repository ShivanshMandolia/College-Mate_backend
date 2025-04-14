import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // User who will receive the notification
  message: { type: String, required: true },  // Notification message
  read: { type: Boolean, default: false },   // Mark the notification as read
  createdAt: { type: Date, default: Date.now },  // Timestamp
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
