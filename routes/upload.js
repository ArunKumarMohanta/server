require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const generateUniqueId = require('../utils/generateId');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Google Sheets Credentials
const SERVICE_ACCOUNT = {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

// Google Sheets Setup
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const doc = new GoogleSpreadsheet(SHEET_ID);

// Handle file upload
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploaderName = req.body.uploaderName;
    const trackerId = generateUniqueId();
    const uploadDate = new Date().toISOString();

    // Upload image to Cloudinary
    cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      async (error, cloudinaryResult) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return res.status(500).json({ error: 'Cloudinary upload failed' });
        }

        const fileUrl = cloudinaryResult.secure_url;

        // Send Cloudinary URL response immediately
        res.json({
          success: true,
          message: "File uploaded successfully",
          downloadLink: fileUrl
        });

        // Save data to Google Sheets in the background
        try {
          // Authenticate Google Sheets using JWT
          await doc.useServiceAccountAuth(SERVICE_ACCOUNT);
          await doc.loadInfo(); // Load spreadsheet info
          
          const sheet = doc.sheetsByIndex[0]; // Get first sheet
          await sheet.addRow({
            Date: uploadDate,
            File_URL: fileUrl,
            Tracker_ID: trackerId,
            Uploader: uploaderName,
          });

          console.log("✔ Google Sheets Update Completed");
        } catch (sheetError) {
          console.error('❌ Google Sheets Update Error:', sheetError);
        }
      }
    ).end(req.file.buffer);

  } catch (error) {
    console.error('Error in upload:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
