require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

// Load Google Service Account Credentials
const SERVICE_ACCOUNT = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));

// Authenticate with Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Google Sheets Setup
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const doc = new GoogleSpreadsheet(SHEET_ID);

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// File Upload Route
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { uploader } = req.body;
    const fileUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
    const trackerId = Math.random().toString(36).substring(2, 9).toUpperCase();
    const date = new Date().toISOString();

    // Authenticate and Load Google Sheet
    await doc.useServiceAccountAuth(SERVICE_ACCOUNT);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    // Append Data to Google Sheets
    await sheet.addRow({
      Date: date,
      File_URL: fileUrl,
      Tracker_ID: trackerId,
      Uploader: uploader || "Anonymous",
    });

    res.json({ message: "File uploaded successfully", fileUrl, trackerId });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
