require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to convert image URL to Base64
async function imageToBase64(url) {
  const response = await fetch(url);
  const buffer = await response.buffer();
  return buffer.toString('base64');
}

router.post('/', async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is missing" });
  }

  try {
    const base64Image = await imageToBase64(imageUrl); // Convert image to Base64

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
      Analyze the provided image and provide only the following structured output:
      Name: (Image name based on content)
      Artist: (If unknown, write "Unknown")
      AI Identification Score: (Score out of 100 and confidence level)
      Originality Score: (Score out of 100 and confidence level)
      Conclusion: (One sentence stating if it's AI-generated or original)
      Description: (Brief description of image content)
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: base64Image } } // Send Base64 data
    ]);

    res.json({ success: true, analysis: result.response.text() });
  } catch (error) {
    console.error("❌ AI Analysis Error:", error);
    res.status(500).json({ success: false, error: "Failed to get AI analysis" });
  }
});

module.exports = router;
