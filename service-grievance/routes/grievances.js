const express = require("express");
const {
  createGrievance,
  getPublicFeed,
  getManagementFeed,
  addTags,
  clusterGrievances,
  updateStatus,
  getGrievanceStats,
} = require("../controllers/grievances");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", verifyToken, requireRole(["worker"]), createGrievance);
router.get("/feed", getPublicFeed);
router.get("/stats", getGrievanceStats);
router.get("/management-feed", verifyToken, requireRole(["advocate"]), getManagementFeed);

router.put("/cluster", verifyToken, requireRole(["advocate"]), clusterGrievances);
router.put("/:id/tags", verifyToken, requireRole(["advocate"]), addTags);
router.put("/:id/status", verifyToken, requireRole(["advocate"]), updateStatus);

module.exports = router;
