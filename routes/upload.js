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
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix new lines
};

// Google Sheets Setup
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const doc = new GoogleSpreadsheet(SHEET_ID);
const auth = new JWT({
  email: SERVICE_ACCOUNT.client_email,
  key: SERVICE_ACCOUNT.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Handle file upload
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploaderName = req.body.uploaderName;
    const trackerId = generateUniqueId();
    const uploadDate = new Date().toISOString();

    // Convert buffer to Base64
    const imageBase64 = req.file.buffer.toString('base64');

    // Upload image to Cloudinary
    cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      async (error, cloudinaryResult) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return res.status(500).json({ error: 'Cloudinary upload failed' });
        }

        const fileUrl = cloudinaryResult.secure_url;

        // AI Analysis with Gemini (Use Base64 instead of URL)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `
          Analyze the provided image and give the following details:
          Name: Image name based on its content.
          Artist: If unknown, write "Unknown".
          AI Identification Score: Score out of 100 (High for AI-generated) and confidence level.
          Originality Score: Score out of 100 (High for original) and confidence level.
          Conclusion: AI-generated or original.
          Description: A brief description of the image content.
        `;

        try {
          const aiResponse = await model.generateContent([
            prompt,
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]);
          const analysisText = aiResponse.response.text();

          // Save data to Google Sheets
          await doc.useServiceAccountAuth(auth);
          await doc.loadInfo();
          const sheet = doc.sheetsByIndex[0];
          await sheet.addRow({
            Date: uploadDate,
            File_URL: fileUrl,
            Tracker_ID: trackerId,
            Uploader: uploaderName,
          });

          // Response
          res.json({
            success: true,
            message: 'File uploaded and analyzed successfully!',
            downloadLink: fileUrl,
            aiAnalysis: analysisText,
          });
        } catch (aiError) {
          console.error('AI Analysis Error:', aiError);
          return res.status(500).json({ error: 'AI analysis failed' });
        }
      }
    ).end(req.file.buffer);

  } catch (error) {
    console.error('Error in upload:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
