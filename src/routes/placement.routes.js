import { Router } from "express";
import {
  createPlacement,
  assignPlacementToAdmin, // New controller for assigning placements
  addPlacementUpdate,
  getAllPlacementsForStudent,
  getPlacementDetails,
  deletePlacement,
  getAllPlacementsForAdmin,
  updateStudentStatus,
  registerForPlacement,
  getAllRegisteredStudentsForPlacement,
  getAllAdmins
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

// 🔸 Superadmin assigns a placement to an admin
router.post(
  "/:placementId/assign-admin",
  verifyJWT,
  assignPlacementToAdmin
);

// 🔸 Add update to a specific placement (Superadmin or assigned Admin only)
router.post(
  "/:placementId/update",
  verifyJWT,
  addPlacementUpdate
);

// 🔸 Register for a specific placement (Student only)
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
router.get(
  "/all-admins",
  verifyJWT,
  getAllAdmins
);

// 🔸 Get details of a specific placement (Student, Superadmin, or assigned Admin)
router.get(
  "/:placementId",
  verifyJWT,
  getPlacementDetails
);

// 🔸 Superadmin deletes a placement
router.delete(
  "/:placementId",
  verifyJWT,
  deletePlacement
);

// 🔸 Get all placements (Superadmin sees all, Admin sees only assigned ones)
router.get(
  "/admin/all",
  verifyJWT,
  getAllPlacementsForAdmin
);

// 🔸 Update student status (Superadmin or assigned Admin only)
router.post(
  "/:placementId/update-status",
  verifyJWT,
  updateStudentStatus
);

// 🔸 View all registered students for a specific placement (Superadmin or assigned Admin only)
router.get(
  "/:placementId/registered-students",
  verifyJWT,
  getAllRegisteredStudentsForPlacement
);

export default router;
