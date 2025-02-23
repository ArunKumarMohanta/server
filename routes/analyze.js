require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
  // Expecting the Base64 image string in "imageBase64"
  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Base64 image is missing" });
  }

  try {
    // Use the updated model that supports image analysis
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Analyze the provided image and provide only the following structured output:
      Name: (Image name based on content)
      Artist: (If unknown, write "Unknown")
      AI Identification Score: (Score out of 100 and confidence level)
      Originality Score: (Score out of 100 and confidence level)
      Conclusion: (One sentence stating if it's AI-generated or original)
      Description: (Brief description of image content)
    `;

    // Call generateContent using the correct structure
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]
        }
      ]
    });

    // Safely extract the AI's response from candidates
    const textResponse = result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0].text
      ? result.candidates[0].content.parts[0].text
      : "No response from AI";

    res.json({ success: true, analysis: textResponse });
  } catch (error) {
    console.error("❌ AI Analysis Error:", error);
    res.status(500).json({ success: false, error: "Failed to get AI analysis" });
  }
});

module.exports = router;
