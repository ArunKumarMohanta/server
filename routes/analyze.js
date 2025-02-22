require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is missing" });
  }

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

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: imageUrl } } // Using URL instead of base64
    ]);

    const analysisText = result.response.text();
    res.json({ success: true, analysis: analysisText });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ success: false, error: "Failed to get AI analysis" });
  }
});

module.exports = router;
