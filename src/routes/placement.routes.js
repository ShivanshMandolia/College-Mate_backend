import { Router } from "express";
import {
  createPlacement,
  addPlacementUpdate,
  getAllPlacementsForStudent,
  getPlacementDetails,
  deletePlacement,
  getAllPlacementsForAdmin,
  updateStudentStatus,
  registerForPlacement,
  getAllRegisteredStudentsForPlacement  // Import the new controller
} from "../controllers/placement.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// 🔸 Superadmin creates a new placement
router.post(
  "/create",
  verifyJWT,
  createPlacement
);

// 🔸 Add update to a specific placement
router.post(
  "/:placementId/update",
  verifyJWT,
  addPlacementUpdate
);

// 🔸 Register for a specific placement
router.post(
  "/:placementId/register",
  verifyJWT,
  upload.fields([{ name: "resume", maxCount: 1 }]),
  registerForPlacement
);

// 🔸 Student gets all placements
router.get(
  "/student/all",
  verifyJWT,
  getAllPlacementsForStudent
);

// 🔸 Student gets details of a specific placement
router.get(
  "/student/:placementId",
  verifyJWT,
  getPlacementDetails
);

// 🔸 Admin/Superadmin deletes a placement
router.delete(
  "/:placementId",
  verifyJWT,
  deletePlacement
);

// 🔸 Admin/Superadmin fetches all placements
router.get(
  "/admin/all",
  verifyJWT,
  getAllPlacementsForAdmin
);

// 🔸 Admin/Superadmin updates student status
router.post(
  "/:placementId/update-status",
  verifyJWT,
  updateStudentStatus
);


// 🔸 Superadmin views all registered students for a specific placement
router.get(
  "/:placementId/registered-students",
  verifyJWT,
  getAllRegisteredStudentsForPlacement // Add the new route here
);

export default router;
