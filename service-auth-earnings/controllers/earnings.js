const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const axios = require("axios");
const mongoose = require("mongoose");
const Shift = require("../models/Shift");
const User = require("../models/User");

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

function roundToTwo(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function getUtcMonthStart(referenceDate = new Date()) {
  return new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
}

function addUtcMonths(date, amount) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function buildSafeUser(user) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    demographics: user.demographics || {},
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function summarizeShifts(shifts = []) {
  const summary = shifts.reduce(
    (accumulator, shift) => {
      accumulator.gross += shift.gross || 0;
      accumulator.deductions += shift.deductions || 0;
      accumulator.net += shift.net || 0;
      accumulator.hours += shift.hours || 0;
      accumulator.shiftCount += 1;
      return accumulator;
    },
    {
      gross: 0,
      deductions: 0,
      net: 0,
      hours: 0,
      shiftCount: 0,
    }
  );

  const averageCommissionRate =
    summary.gross > 0 ? (summary.deductions / summary.gross) * 100 : 0;
  const averageHourlyRate = summary.hours > 0 ? summary.net / summary.hours : 0;

  return {
    gross: roundToTwo(summary.gross),
    deductions: roundToTwo(summary.deductions),
    net: roundToTwo(summary.net),
    hours: roundToTwo(summary.hours),
    shiftCount: summary.shiftCount,
    averageCommissionRate: roundToTwo(averageCommissionRate),
    averageHourlyRate: roundToTwo(averageHourlyRate),
  };
}

function buildDailyTrend(shifts = []) {
  const grouped = new Map();

  for (const shift of shifts) {
    const shiftDate = shift.date || shift.createdAt;
    if (!shiftDate) {
      continue;
    }

    const isoDate = new Date(shiftDate).toISOString().slice(0, 10);
    const existing = grouped.get(isoDate) || {
      date: isoDate,
      gross: 0,
      deductions: 0,
      net: 0,
      hours: 0,
      shiftCount: 0,
    };

    existing.gross += shift.gross || 0;
    existing.deductions += shift.deductions || 0;
    existing.net += shift.net || 0;
    existing.hours += shift.hours || 0;
    existing.shiftCount += 1;
    grouped.set(isoDate, existing);
  }

  return [...grouped.values()]
    .sort((first, second) => first.date.localeCompare(second.date))
    .map((entry) => ({
      date: entry.date,
      gross: roundToTwo(entry.gross),
      deductions: roundToTwo(entry.deductions),
      net: roundToTwo(entry.net),
      hours: roundToTwo(entry.hours),
      shiftCount: entry.shiftCount,
      commissionRate:
        entry.gross > 0 ? roundToTwo((entry.deductions / entry.gross) * 100) : 0,
      hourlyRate: entry.hours > 0 ? roundToTwo(entry.net / entry.hours) : 0,
    }));
}

function buildVerificationSummary(shifts = []) {
  return shifts.reduce(
    (accumulator, shift) => {
      const status = shift.verificationStatus || "pending";
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    },
    {
      pending: 0,
      confirmed: 0,
      flagged: 0,
      unverifiable: 0,
    }
  );
}

function deriveWorkerStatus(verificationSummary, latestShift) {
  if (verificationSummary.flagged > 0) {
    return "Flagged";
  }

  if (!latestShift || verificationSummary.pending > 0) {
    return "Pending";
  }

  if (verificationSummary.confirmed > 0) {
    return "Verified";
  }

  if (verificationSummary.unverifiable > 0) {
    return "Unverifiable";
  }

  return "Pending";
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

async function detectShiftAnomalies(shiftPayload) {
  try {
    const { data } = await axios.post(
      "http://localhost:8001/detect-anomalies",
      { shifts: [shiftPayload] },
      { timeout: 5000 }
    );

    if (!data) {
      return [];
    }

    if (Array.isArray(data)) {
      return data.map((item) => item.type || item.human_readable_explanation).filter(Boolean);
    }

    return [];
  } catch (error) {
    // The anomaly detector is a secondary service; log and continue core flow.
    console.warn("Anomaly service unavailable, proceeding without anomaly flags:", error.message);
    return [];
  }
}

async function logShift(req, res, next) {
  try {
    const normalized = normalizeShiftInput(req.body);
    if (!normalized.isValid) {
      return res.status(400).json({ message: normalized.error });
    }

    const anomalyFlags = await detectShiftAnomalies(normalized.shift);
    const verificationStatus = anomalyFlags.length ? "flagged" : undefined;

    const shift = await Shift.create({
      workerId: req.user._id,
      ...normalized.shift,
      verificationStatus,
      anomalyFlags,
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

async function getWorkerDashboard(req, res, next) {
  try {
    const [user, shifts] = await Promise.all([
      User.findById(req.user._id).lean(),
      Shift.find({ workerId: req.user._id }).sort({ date: -1, createdAt: -1 }).lean(),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const monthStart = getUtcMonthStart();
    const nextMonthStart = addUtcMonths(monthStart, 1);
    const monthlyShifts = shifts.filter((shift) => {
      const shiftDate = shift.date || shift.createdAt;
      return shiftDate && shiftDate >= monthStart && shiftDate < nextMonthStart;
    });
    const verificationSummary = buildVerificationSummary(shifts);
    const latestShift = shifts[0] || null;

    return res.json({
      user: buildSafeUser(user),
      monthly: summarizeShifts(monthlyShifts),
      dailyTrend: buildDailyTrend(monthlyShifts),
      verificationSummary,
      latestShift,
      profileStatus: deriveWorkerStatus(verificationSummary, latestShift),
      recentShifts: shifts.slice(0, 8),
      totalShiftCount: shifts.length,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateVerificationStatus(req, res, next) {
  try {
    const { shiftId } = req.params;
    const { verificationStatus, reviewNote } = req.body;

    if (!ALLOWED_STATUSES.has(verificationStatus)) {
      return res.status(400).json({
        message: "verificationStatus must be one of pending, confirmed, flagged, unverifiable.",
      });
    }

    const shift = await Shift.findById(shiftId);

    if (!shift) {
      return res.status(404).json({ message: "Shift not found." });
    }

    shift.verificationStatus = verificationStatus;

    if (typeof reviewNote === "string" && reviewNote.trim()) {
      shift.anomalyFlags = [...new Set([...(shift.anomalyFlags || []), reviewNote.trim()])];
    }

    await shift.save();

    return res.json({
      message: "Verification status updated.",
      shift,
    });
  } catch (error) {
    return next(error);
  }
}

async function getVerifierQueue(req, res, next) {
  try {
    const requestedStatus = req.query.status;
    const queueStatuses =
      requestedStatus && ALLOWED_STATUSES.has(requestedStatus)
        ? [requestedStatus]
        : ["pending", "flagged"];

    const queue = await Shift.find({ verificationStatus: { $in: queueStatuses } })
      .populate({
        path: "workerId",
        select: "fullName email role demographics createdAt updatedAt",
      })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const workerIds = [...new Set(queue.map((item) => String(item.workerId?._id || item.workerId)).filter(Boolean))];
    const monthStart = getUtcMonthStart();
    const nextMonthStart = addUtcMonths(monthStart, 1);

    let monthlySnapshotsByWorker = new Map();
    if (workerIds.length) {
      const monthlySnapshots = await Shift.aggregate([
        {
          $match: {
            workerId: { $in: workerIds.map((id) => new mongoose.Types.ObjectId(id)) },
            date: { $gte: monthStart, $lt: nextMonthStart },
          },
        },
        {
          $group: {
            _id: "$workerId",
            gross: { $sum: "$gross" },
            deductions: { $sum: "$deductions" },
            net: { $sum: "$net" },
            hours: { $sum: "$hours" },
            shiftCount: { $sum: 1 },
          },
        },
      ]);

      monthlySnapshotsByWorker = new Map(
        monthlySnapshots.map((snapshot) => {
          const metrics = summarizeShifts([
            {
              gross: snapshot.gross,
              deductions: snapshot.deductions,
              net: snapshot.net,
              hours: snapshot.hours,
            },
          ]);

          return [
            String(snapshot._id),
            {
              gross: metrics.gross,
              deductions: metrics.deductions,
              net: metrics.net,
              hours: metrics.hours,
              shiftCount: snapshot.shiftCount,
              averageCommissionRate: metrics.averageCommissionRate,
              averageHourlyRate: metrics.averageHourlyRate,
            },
          ];
        })
      );
    }

    const items = queue.map((shift) => {
      const worker = buildSafeUser(shift.workerId);
      const workerId = String(worker?._id || shift.workerId);

      return {
        _id: shift._id,
        platform: shift.platform,
        date: shift.date,
        hours: shift.hours,
        gross: shift.gross,
        deductions: shift.deductions,
        net: shift.net,
        screenshotUrl: shift.screenshotUrl || "",
        verificationStatus: shift.verificationStatus,
        anomalyFlags: shift.anomalyFlags || [],
        createdAt: shift.createdAt,
        updatedAt: shift.updatedAt,
        worker,
        workerMonthly: monthlySnapshotsByWorker.get(workerId) || {
          gross: 0,
          deductions: 0,
          net: 0,
          hours: 0,
          shiftCount: 0,
          averageCommissionRate: 0,
          averageHourlyRate: 0,
        },
      };
    });

    return res.json({
      count: items.length,
      summary: {
        pending: items.filter((item) => item.verificationStatus === "pending").length,
        flagged: items.filter((item) => item.verificationStatus === "flagged").length,
      },
      queue: items,
    });
  } catch (error) {
    return next(error);
  }
}

async function getWorkerOverview(req, res, next) {
  try {
    const workers = await User.find({ role: "worker" })
      .select("fullName email role demographics createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const workerIds = workers.map((worker) => worker._id);
    if (!workerIds.length) {
      return res.json({ count: 0, workers: [] });
    }

    const currentMonthStart = getUtcMonthStart();
    const nextMonthStart = addUtcMonths(currentMonthStart, 1);
    const previousMonthStart = addUtcMonths(currentMonthStart, -1);

    const aggregates = await Shift.aggregate([
      {
        $match: {
          workerId: { $in: workerIds },
        },
      },
      {
        $project: {
          workerId: 1,
          verificationStatus: 1,
          shiftDate: { $ifNull: ["$date", "$createdAt"] },
          gross: { $ifNull: ["$gross", 0] },
          deductions: { $ifNull: ["$deductions", 0] },
          net: { $ifNull: ["$net", 0] },
          hours: { $ifNull: ["$hours", 0] },
        },
      },
      {
        $group: {
          _id: "$workerId",
          allTimeShiftCount: { $sum: 1 },
          latestShiftDate: { $max: "$shiftDate" },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$verificationStatus", "pending"] }, 1, 0] },
          },
          confirmedCount: {
            $sum: { $cond: [{ $eq: ["$verificationStatus", "confirmed"] }, 1, 0] },
          },
          flaggedCount: {
            $sum: { $cond: [{ $eq: ["$verificationStatus", "flagged"] }, 1, 0] },
          },
          unverifiableCount: {
            $sum: { $cond: [{ $eq: ["$verificationStatus", "unverifiable"] }, 1, 0] },
          },
          currentMonthGross: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$shiftDate", currentMonthStart] },
                    { $lt: ["$shiftDate", nextMonthStart] },
                  ],
                },
                "$gross",
                0,
              ],
            },
          },
          currentMonthDeductions: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$shiftDate", currentMonthStart] },
                    { $lt: ["$shiftDate", nextMonthStart] },
                  ],
                },
                "$deductions",
                0,
              ],
            },
          },
          currentMonthNet: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$shiftDate", currentMonthStart] },
                    { $lt: ["$shiftDate", nextMonthStart] },
                  ],
                },
                "$net",
                0,
              ],
            },
          },
          currentMonthHours: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$shiftDate", currentMonthStart] },
                    { $lt: ["$shiftDate", nextMonthStart] },
                  ],
                },
                "$hours",
                0,
              ],
            },
          },
          currentMonthShiftCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$shiftDate", currentMonthStart] },
                    { $lt: ["$shiftDate", nextMonthStart] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          previousMonthNet: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$shiftDate", previousMonthStart] },
                    { $lt: ["$shiftDate", currentMonthStart] },
                  ],
                },
                "$net",
                0,
              ],
            },
          },
          previousMonthShiftCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$shiftDate", previousMonthStart] },
                    { $lt: ["$shiftDate", currentMonthStart] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const aggregateByWorkerId = new Map(
      aggregates.map((item) => [String(item._id), item])
    );

    const items = workers
      .map((worker) => {
        const aggregate = aggregateByWorkerId.get(String(worker._id));
        const currentMonth = summarizeShifts(
          aggregate
            ? [
                {
                  gross: aggregate.currentMonthGross,
                  deductions: aggregate.currentMonthDeductions,
                  net: aggregate.currentMonthNet,
                  hours: aggregate.currentMonthHours,
                },
              ]
            : []
        );

        const dropPercent =
          aggregate?.previousMonthNet > 0
            ? roundToTwo(
                ((aggregate.previousMonthNet - aggregate.currentMonthNet) /
                  aggregate.previousMonthNet) *
                  100
              )
            : 0;

        return {
          worker: buildSafeUser(worker),
          metrics: {
            currentMonth: {
              ...currentMonth,
              shiftCount: aggregate?.currentMonthShiftCount || 0,
            },
            previousMonth: {
              net: roundToTwo(aggregate?.previousMonthNet || 0),
              shiftCount: aggregate?.previousMonthShiftCount || 0,
            },
            dropPercent,
            allTimeShiftCount: aggregate?.allTimeShiftCount || 0,
            verificationSummary: {
              pending: aggregate?.pendingCount || 0,
              confirmed: aggregate?.confirmedCount || 0,
              flagged: aggregate?.flaggedCount || 0,
              unverifiable: aggregate?.unverifiableCount || 0,
            },
            latestShiftDate: aggregate?.latestShiftDate || null,
          },
        };
      })
      .sort(
        (first, second) =>
          second.metrics.currentMonth.net - first.metrics.currentMonth.net
      );

    return res.json({
      count: items.length,
      monthStart: currentMonthStart,
      workers: items,
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
  getWorkerDashboard,
  updateVerificationStatus,
  getVerifierQueue,
  getWorkerOverview,
  bulkUploadShifts,
  uploadEvidence,
};
