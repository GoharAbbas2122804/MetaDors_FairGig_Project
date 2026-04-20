const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  logShift,
  getShiftHistory,
  getWorkerDashboard,
  updateVerificationStatus,
  getVerifierQueue,
  getWorkerOverview,
  bulkUploadShifts,
  uploadEvidence,
} = require("../controllers/earnings");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

const uploadRoot = path.join(__dirname, "..", "uploads");
const csvUploadDir = path.join(uploadRoot, "csv");
const evidenceUploadDir = path.join(uploadRoot, "evidence");

fs.mkdirSync(csvUploadDir, { recursive: true });
fs.mkdirSync(evidenceUploadDir, { recursive: true });

const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, csvUploadDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.csv`);
  },
});

const evidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, evidenceUploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const csvUpload = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    const isCsv = file.mimetype === "text/csv" || file.originalname.endsWith(".csv");
    if (!isCsv) {
      return cb(new Error("Only CSV files are allowed for bulk upload."));
    }
    return cb(null, true);
  },
});

const evidenceUpload = multer({
  storage: evidenceStorage,
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    if (!isImage) {
      return cb(new Error("Only image files are allowed for evidence upload."));
    }
    return cb(null, true);
  },
});

router.post("/shift", verifyToken, requireRole(["worker"]), logShift);
router.post("/log-shift", verifyToken, requireRole(["worker"]), logShift);
router.get("/shifts", verifyToken, requireRole(["worker"]), getShiftHistory);
router.get("/dashboard/worker", verifyToken, requireRole(["worker"]), getWorkerDashboard);
router.get("/verifier/queue", verifyToken, requireRole(["verifier"]), getVerifierQueue);
router.get(
  "/workers/overview",
  verifyToken,
  requireRole(["verifier", "advocate"]),
  getWorkerOverview
);
router.patch(
  "/shift/:shiftId/verification-status",
  verifyToken,
  requireRole(["verifier"]),
  updateVerificationStatus
);

router.post(
  "/bulk-upload",
  verifyToken,
  requireRole(["worker"]),
  csvUpload.single("file"),
  bulkUploadShifts
);

router.post(
  "/upload-evidence",
  verifyToken,
  requireRole(["worker"]),
  evidenceUpload.single("evidence"),
  uploadEvidence
);

module.exports = router;
