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
  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Image data is missing" });
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `
    Analyze the provided image and give the following details and
    Give the only output as :
    Name: Image name based on its content.
    Artist: If unknown, write "Unknown".
    AI Identification Score: Score out of 100 (High for AI-generated) and one sentence about how much sure that it is Ai generated.
    Originality Score: Score out of 100 (High for original) and one sentence about how much sure that it is original image.
    Conclusion: Tell in one sentence whether the provided image is AI-generated OR a real original image.
    Description: A brief description of the image content.
  `;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
    ]);
    const text = result.response.text();
    res.json({ analysis: text });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ error: "Failed to get AI analysis" });
  }
});


module.exports = router;
