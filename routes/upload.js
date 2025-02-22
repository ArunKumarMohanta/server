require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const generateUniqueId = require('../utils/generateId');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Google Sheets Authentication
const SERVICE_ACCOUNT = {
  client_email: process.env.GOOGLE_SERVICE_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fixes escaped newlines
};

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const doc = new GoogleSpreadsheet(SHEET_ID);
const auth = new JWT({
  email: SERVICE_ACCOUNT.client_email,
  key: SERVICE_ACCOUNT.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// ✅ File Upload Route
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploaderName = req.body.uploaderName || "Unknown";
    const trackerId = generateUniqueId();
    const uploadDate = new Date().toISOString();
    const imageBase64 = req.file.buffer.toString('base64');

    // ✅ Upload Image to Cloudinary
    cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      async (error, cloudinaryResult) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return res.status(500).json({ error: 'Cloudinary upload failed' });
        }

        const fileUrl = cloudinaryResult.secure_url;

        // ✅ Send Cloudinary URL response immediately
        res.json({
          success: true,
          message: "File uploaded successfully",
          downloadLink: fileUrl
        });

        // ✅ Perform AI Analysis and Google Sheets Update in the Background
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
          const prompt = `
            Analyze the provided image and provide:
            - Name: Image name based on content.
            - Artist: If unknown, write "Unknown".
            - AI Identification Score: Score out of 100 (Higher means more AI-generated).
            - Originality Score: Score out of 100 (Higher means more original).
            - Conclusion: "AI-generated" or "Original".
            - Description: A brief description of the image content.
          `;

          const aiResponse = await model.generateContent([
            prompt,
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]);
          
          const analysisText = aiResponse.response.text();

          // ✅ Save Data to Google Sheets
          await doc.useServiceAccountAuth(auth);
          await doc.loadInfo();
          const sheet = doc.sheetsByIndex[0];
          await sheet.addRow({
            Date: uploadDate,
            File_URL: fileUrl,
            Tracker_ID: trackerId,
            Uploader: uploaderName,
            Analysis: analysisText,
          });

          console.log("✔ AI Analysis and Google Sheets Update Completed");
        } catch (aiError) {
          console.error('❌ AI Analysis Error:', aiError);
        }
      }
    ).end(req.file.buffer);

  } catch (error) {
    console.error('Error in upload:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
