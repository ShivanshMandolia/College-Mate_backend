import { Router } from "express";
import {
  createFoundItem,
  createLostItem,
  getAllFoundItems,
  getAllLostItems,
  getFoundItemDetail,
  getLostItemDetail,
  deleteFoundItem,
  deleteLostItem,
  getMyFoundListings,
  getMyLostListings,
} from "../controllers/lostfound.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Create a new found item (protected, with image upload)
router.route("/found-item").post(
  verifyJWT,
  upload.fields([{ name: "image", maxCount: 1 }]),
  createFoundItem
);

// Create a new lost item request (protected, with image upload)
router.route("/lost-item").post(
  verifyJWT,
  upload.fields([{ name: "image", maxCount: 1 }]),
  createLostItem
);

// Get all found items (public)
router.route("/found-items").get(getAllFoundItems);

// Get all lost items (public)
router.route("/lost-items").get(getAllLostItems);

// Get detail of a specific found item (public)
router.route("/found-item/:id").get(getFoundItemDetail);

// Get detail of a specific lost item (public)
router.route("/lost-item/:id").get(getLostItemDetail);

// Delete a found item (protected, only owner)
router.route("/found-item/:id").delete(verifyJWT, deleteFoundItem);

// Delete a lost item (protected, only owner)
router.route("/lost-item/:id").delete(verifyJWT, deleteLostItem);

// Get found items posted by logged-in user
router.route("/my-found-listings").get(verifyJWT, getMyFoundListings);

// Get lost items posted by logged-in user
router.route("/my-lost-listings").get(verifyJWT, getMyLostListings);

export default router;
