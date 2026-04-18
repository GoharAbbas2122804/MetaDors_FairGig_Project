const path = require("path");
const crypto = require("crypto");
const cors = require("cors");
const ejs = require("ejs");
const express = require("express");
const mongoose = require("mongoose");
const puppeteer = require("puppeteer");
const Shift = require("./models/Shift");
const { verifyToken } = require("./middleware/auth");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5003;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/fairgig";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB at ${MONGODB_URI}`);
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });

app.use(cors());
app.use(express.json());
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "certificate" });
});

app.get("/generate-certificate/:workerId", verifyToken, async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { startDate, endDate, format = "html" } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate query params are required." });
    }

    if (req.user.role === "worker" && req.user._id !== workerId) {
      return res.status(403).json({ message: "Workers can only request their own certificate." });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ message: "Invalid startDate or endDate." });
    }

    const shifts = await Shift.find({
      workerId,
      verificationStatus: "confirmed",
      date: { $gte: parsedStartDate, $lte: parsedEndDate },
    })
      .sort({ date: 1 })
      .lean();

    if (!shifts.length) {
      return res.status(404).json({ message: "No verified shifts found for this date range." });
    }

    const platformMap = new Map();
    let gross = 0;
    let deductions = 0;
    let net = 0;

    for (const shift of shifts) {
      gross += shift.gross;
      deductions += shift.deductions;
      net += shift.net;

      const existing = platformMap.get(shift.platform) || {
        platform: shift.platform,
        totalShifts: 0,
        gross: 0,
        deductions: 0,
        net: 0,
      };

      existing.totalShifts += 1;
      existing.gross += shift.gross;
      existing.deductions += shift.deductions;
      existing.net += shift.net;
      platformMap.set(shift.platform, existing);
    }

    const perPlatform = [...platformMap.values()];
    const certificateData = {
      certificateId: `CERT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      issuedDate: new Date().toISOString().slice(0, 10),
      workerId,
      startDate: parsedStartDate.toISOString().slice(0, 10),
      endDate: parsedEndDate.toISOString().slice(0, 10),
      perPlatform,
      totals: {
        totalShifts: shifts.length,
        gross,
        deductions,
        net,
      },
    };

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
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({
    message: error.message || "Internal server error.",
  });
});

app.listen(PORT, () => {
  console.log(`service-certificate is running on port ${PORT}`);
});
