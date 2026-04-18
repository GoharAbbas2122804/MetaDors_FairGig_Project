const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const Shift = require("../models/Shift");

const ALLOWED_STATUSES = new Set([
  "pending",
  "confirmed",
  "flagged",
  "unverifiable",
]);

function toPositiveNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeShiftInput(payload) {
  const platform = typeof payload.platform === "string" ? payload.platform.trim() : "";
  const date = parseDate(payload.date);
  const hours = toPositiveNumber(payload.hours);
  const gross = toPositiveNumber(payload.gross);
  const deductions = toPositiveNumber(payload.deductions);
  const screenshotUrl =
    typeof payload.screenshotUrl === "string" ? payload.screenshotUrl.trim() : undefined;

  if (!platform || !date || hours === null || gross === null || deductions === null) {
    return { isValid: false, error: "platform, date, hours, gross, deductions are required." };
  }

  if (deductions > gross) {
    return { isValid: false, error: "deductions cannot be greater than gross." };
  }

  return {
    isValid: true,
    shift: {
      platform,
      date,
      hours,
      gross,
      deductions,
      net: gross - deductions,
      screenshotUrl,
    },
  };
}

async function logShift(req, res, next) {
  try {
    const normalized = normalizeShiftInput(req.body);
    if (!normalized.isValid) {
      return res.status(400).json({ message: normalized.error });
    }

    const shift = await Shift.create({
      workerId: req.user._id,
      ...normalized.shift,
    });

    return res.status(201).json({
      message: "Shift logged successfully.",
      shift,
    });
  } catch (error) {
    return next(error);
  }
}

async function getShiftHistory(req, res, next) {
  try {
    const query = { workerId: req.user._id };
    if (req.query.status && ALLOWED_STATUSES.has(req.query.status)) {
      query.verificationStatus = req.query.status;
    }

    const shifts = await Shift.find(query).sort({ date: -1, createdAt: -1 }).lean();
    return res.json({ count: shifts.length, shifts });
  } catch (error) {
    return next(error);
  }
}

async function updateVerificationStatus(req, res, next) {
  try {
    const { shiftId } = req.params;
    const { verificationStatus } = req.body;

    if (!ALLOWED_STATUSES.has(verificationStatus)) {
      return res.status(400).json({
        message: "verificationStatus must be one of pending, confirmed, flagged, unverifiable.",
      });
    }

    const shift = await Shift.findByIdAndUpdate(
      shiftId,
      { verificationStatus },
      { new: true, runValidators: true }
    );

    if (!shift) {
      return res.status(404).json({ message: "Shift not found." });
    }

    return res.json({
      message: "Verification status updated.",
      shift,
    });
  } catch (error) {
    return next(error);
  }
}

async function bulkUploadShifts(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required under file field." });
    }

    const validRows = [];
    const rejectedRows = [];

    await new Promise((resolve, reject) => {
      let lineNumber = 1;
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          lineNumber += 1;
          const normalized = normalizeShiftInput(row);
          if (!normalized.isValid) {
            rejectedRows.push({ line: lineNumber, reason: normalized.error, row });
            return;
          }

          validRows.push({
            workerId: req.user._id,
            ...normalized.shift,
          });
        })
        .on("end", resolve)
        .on("error", reject);
    });

    let insertedCount = 0;
    if (validRows.length) {
      const inserted = await Shift.insertMany(validRows, { ordered: false });
      insertedCount = inserted.length;
    }

    return res.status(201).json({
      message: "Bulk upload processed.",
      insertedCount,
      rejectedCount: rejectedRows.length,
      rejectedRows,
    });
  } catch (error) {
    return next(error);
  } finally {
    if (req.file?.path) {
      fs.promises.unlink(req.file.path).catch(() => {});
    }
  }
}

async function uploadEvidence(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required under evidence field." });
    }

    const evidenceUrl = `/uploads/evidence/${req.file.filename}`;
    const { shiftId } = req.body;

    if (shiftId) {
      const shift = await Shift.findOneAndUpdate(
        { _id: shiftId, workerId: req.user._id },
        { screenshotUrl: evidenceUrl },
        { new: true }
      );

      if (!shift) {
        return res.status(404).json({ message: "Shift not found for this worker." });
      }

      return res.status(201).json({
        message: "Evidence uploaded and attached to shift.",
        evidenceUrl,
        shift,
      });
    }

    return res.status(201).json({
      message: "Evidence uploaded successfully.",
      evidenceUrl,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  logShift,
  getShiftHistory,
  updateVerificationStatus,
  bulkUploadShifts,
  uploadEvidence,
};
