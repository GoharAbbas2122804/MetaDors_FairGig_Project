const mongoose = require("mongoose");
const Grievance = require("../models/Grievance");

const ALLOWED_STATUSES = new Set(["escalated", "resolved"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

async function createGrievance(req, res, next) {
  try {
    const { category, description, isPublic = true } = req.body;

    if (!isNonEmptyString(category) || !isNonEmptyString(description)) {
      return res.status(400).json({
        message: "category and description are required non-empty strings.",
      });
    }

    if (typeof isPublic !== "boolean") {
      return res.status(400).json({ message: "isPublic must be a boolean when provided." });
    }

    const grievance = await Grievance.create({
      workerId: req.user._id,
      category: category.trim().toLowerCase(),
      description: description.trim(),
      isPublic,
    });

    return res.status(201).json({
      message: "Complaint created successfully.",
      grievance,
    });
  } catch (error) {
    return next(error);
  }
}

async function getPublicFeed(req, res, next) {
  try {
    const grievances = await Grievance.find({ isPublic: true })
      .select("-workerId")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      count: grievances.length,
      grievances,
    });
  } catch (error) {
    return next(error);
  }
}

async function getManagementFeed(req, res, next) {
  try {
    const grievances = await Grievance.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "workerId",
          foreignField: "_id",
          as: "worker",
        },
      },
      {
        $unwind: {
          path: "$worker",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          category: 1,
          description: 1,
          status: 1,
          tags: 1,
          clusterId: 1,
          isPublic: 1,
          createdAt: 1,
          updatedAt: 1,
          worker: {
            _id: "$worker._id",
            fullName: "$worker.fullName",
            email: "$worker.email",
            role: "$worker.role",
            demographics: { $ifNull: ["$worker.demographics", {}] },
          },
        },
      },
    ]);

    return res.status(200).json({
      count: grievances.length,
      grievances,
    });
  } catch (error) {
    return next(error);
  }
}

async function addTags(req, res, next) {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid grievance id." });
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ message: "tags must be a non-empty string array." });
    }

    const normalizedTags = [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()))].filter(
      (tag) => tag.length > 0
    );

    if (!normalizedTags.length) {
      return res.status(400).json({ message: "tags must contain at least one valid string." });
    }

    const grievance = await Grievance.findByIdAndUpdate(
      id,
      { $addToSet: { tags: { $each: normalizedTags } } },
      { new: true }
    );

    if (!grievance) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    return res.status(200).json({
      message: "Tags added successfully.",
      grievance,
    });
  } catch (error) {
    return next(error);
  }
}

async function clusterGrievances(req, res, next) {
  try {
    const { grievanceIds } = req.body;

    if (!Array.isArray(grievanceIds) || grievanceIds.length < 2) {
      return res.status(400).json({
        message: "grievanceIds must be an array with at least two grievance IDs.",
      });
    }

    if (!grievanceIds.every((id) => isValidObjectId(id))) {
      return res.status(400).json({ message: "All grievanceIds must be valid MongoDB ObjectIds." });
    }

    const uniqueIds = [...new Set(grievanceIds)];
    const existingCount = await Grievance.countDocuments({ _id: { $in: uniqueIds } });
    if (existingCount !== uniqueIds.length) {
      return res.status(404).json({ message: "One or more complaints were not found." });
    }

    const clusterId = new mongoose.Types.ObjectId().toString();
    const result = await Grievance.updateMany(
      { _id: { $in: uniqueIds } },
      { $set: { clusterId } }
    );

    return res.status(200).json({
      message: "Complaints clustered successfully.",
      clusterId,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid grievance id." });
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({ message: "status must be either escalated or resolved." });
    }

    const grievance = await Grievance.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!grievance) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    return res.status(200).json({
      message: "Complaint status updated.",
      grievance,
    });
  } catch (error) {
    return next(error);
  }
}

async function getGrievanceStats(req, res, next) {
  try {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 7);

    const [topCategories, activeDeactivation] = await Promise.all([
      Grievance.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            category: "$_id",
            count: 1,
          },
        },
      ]),
      Grievance.countDocuments({
        category: "deactivation",
        status: { $ne: "resolved" },
      }),
    ]);

    return res.status(200).json({
      weekWindowStart: weekStart,
      topCategoriesThisWeek: topCategories,
      activeDeactivationComplaints: activeDeactivation,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createGrievance,
  getPublicFeed,
  getManagementFeed,
  addTags,
  clusterGrievances,
  updateStatus,
  getGrievanceStats,
};
