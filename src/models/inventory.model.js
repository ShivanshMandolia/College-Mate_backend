import mongoose from "mongoose";
// Define the schema for the inventory model
const inventorySchema = new mongoose.Schema({
  dishId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },  // Refers to the Dish model
  quantity: { type: Number, required: true, default: 0 }, // Quantity available in stock
  restockLevel: { type: Number, required: true, default: 5 }, // Level at which to restock
  lastRestockedAt: { type: Date, default: Date.now }, // Date when the item was last restocked
});

// Create the Inventory model
module.exports = mongoose.model('Inventory', inventorySchema);
