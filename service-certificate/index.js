const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const crypto = require("crypto");
const cors = require("cors");
const ejs = require("ejs");
const express = require("express");
const mongoose = require("mongoose");
const puppeteer = require("puppeteer");
const Shift = require("./models/Shift");
const User = require("./models/User");
const { verifyToken } = require("./middleware/auth");
const { buildCorsOptions } = require("../shared/auth");
const {
  applySecurityHeaders,
  redactMongoUri,
  sanitizeErrorForLog,
} = require("../shared/security");

const app = express();
const PORT = process.env.PORT || 5003;
const DEFAULT_DB_NAME = process.env.MONGO_DB_NAME || "fairgig";

function ensureMongoDatabaseName(uri, databaseName = DEFAULT_DB_NAME) {
  if (typeof uri !== "string" || !uri.trim()) {
    return `mongodb://localhost:27017/${databaseName}`;
  }

  const trimmedUri = uri.trim();

  if (trimmedUri.startsWith("mongodb+srv://")) {
    const protocolSeparatorIndex = trimmedUri.indexOf("://");
    const queryIndex = trimmedUri.indexOf("?");
    const pathStartIndex = trimmedUri.indexOf("/", protocolSeparatorIndex + 3);

    if (pathStartIndex === -1) {
      return `${trimmedUri}/${databaseName}`;
    }

    const pathEndIndex = queryIndex === -1 ? trimmedUri.length : queryIndex;
    const currentPath = trimmedUri.slice(pathStartIndex + 1, pathEndIndex);

    if (!currentPath) {
      const base = trimmedUri.slice(0, pathStartIndex + 1);
      const suffix = queryIndex === -1 ? "" : trimmedUri.slice(queryIndex);
      return `${base}${databaseName}${suffix}`;
    }

    return trimmedUri;
  }

  return trimmedUri;
}

const MONGODB_URI = ensureMongoDatabaseName(
  process.env.MONGODB_URI || "mongodb://localhost:27017/fairgig"
);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB (${redactMongoUri(MONGODB_URI)})`);
  })
  .catch((error) => {
    console.error("MongoDB connection error:", sanitizeErrorForLog(error));
    process.exit(1);
  });

app.disable("x-powered-by");
app.use(cors(buildCorsOptions()));
app.use(applySecurityHeaders);
app.use(express.json({ limit: "100kb" }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "certificate" });
});

app.get("/generate-certificate/:workerId", verifyToken, async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { startDate, endDate, format = "html" } = req.query;
    const allowedFormats = new Set(["html", "json", "pdf"]);

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate query params are required." });
    }

    if (!allowedFormats.has(format)) {
      return res.status(400).json({ message: "format must be one of html, json, pdf." });
    }

    if (req.user.role === "worker" && String(req.user._id) !== String(workerId)) {
      return res.status(403).json({ message: "Workers can only request their own certificate." });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ message: "Invalid startDate or endDate." });
    }

    const [worker, shifts] = await Promise.all([
      User.findById(workerId).lean(),
      Shift.find({
        workerId,
        verificationStatus: "confirmed",
        date: { $gte: parsedStartDate, $lte: parsedEndDate },
      })
        .sort({ date: 1 })
        .lean(),
    ]);

    if (!worker) {
      return res.status(404).json({ message: "Worker not found." });
    }

    if (!shifts.length) {
      return res.status(404).json({ message: "No verified shifts found for this date range." });
    }

    const platformMap = new Map();
    let gross = 0;
    let deductions = 0;
    let net = 0;
    let totalHours = 0;

    for (const shift of shifts) {
      gross += shift.gross;
      deductions += shift.deductions;
      net += shift.net;
      totalHours += shift.hours;

      const existing = platformMap.get(shift.platform) || {
        platform: shift.platform,
        totalShifts: 0,
        gross: 0,
        deductions: 0,
        net: 0,
        hours: 0,
      };

      existing.totalShifts += 1;
      existing.gross += shift.gross;
      existing.deductions += shift.deductions;
      existing.net += shift.net;
      existing.hours += shift.hours;
      platformMap.set(shift.platform, existing);
    }

    const perPlatform = [...platformMap.values()];
    const certificateData = {
      certificateId: `CERT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      issuedDate: new Date().toISOString().slice(0, 10),
      workerId,
      worker: {
        _id: worker._id,
        fullName: worker.fullName,
        email: worker.email,
        role: worker.role,
        demographics: worker.demographics || {},
      },
      startDate: parsedStartDate.toISOString().slice(0, 10),
      endDate: parsedEndDate.toISOString().slice(0, 10),
      perPlatform,
      totals: {
        totalShifts: shifts.length,
        totalHours,
        gross,
        deductions,
        net,
      },
    };

    if (format === "json") {
      return res.status(200).json(certificateData);
    }

    const html = await ejs.renderFile(
      path.join(__dirname, "views", "certificate.ejs"),
      certificateData
    );

    if (format === "pdf") {
      const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="income-certificate-${workerId}.pdf"`
        );
        return res.send(pdfBuffer);
      } finally {
        await browser.close();
      }
    }

    return res.status(200).send(html);
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, next) => {
  console.error("service-certificate error:", sanitizeErrorForLog(error));
  const status = error.status || 500;
  res.status(status).json({
    message: error.message || "Internal server error.",
  });
});

app.listen(PORT, () => {
  console.log(`service-certificate is running on port ${PORT}`);
});
