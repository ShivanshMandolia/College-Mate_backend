import mongoose, { Schema } from "mongoose";
const menuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  quantityAvailable: { type: Number, required: true },
  tags: { type: [String], required: true }, // e.g. ["spicy", "combo"]
  image: { type: String, required: true },  // Cloudinary URL
  category: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack', 'beverage'],
    required: true
  },
  isVegan: { type: Boolean, required: true },
  isVegetarian: { type: Boolean, required: true },
  isGlutenFree: { type: Boolean, required: true },
  prepTime: { type: Number, required: true }, // in minutes
  date: { type: Date, required: true }, // ISO date
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Menu', menuSchema);
