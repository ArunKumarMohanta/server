require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res) => {
  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Base64 image is missing" });
  }

  try {
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

    console.log("AI API raw result:", result); // Debug log to inspect the response

    // Safely extract response
    let textResponse = "No response from AI";
    if (result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
      textResponse = result.candidates[0].content.parts[0].text;
    }

    res.json({ success: true, analysis: textResponse });
  } catch (error) {
    console.error("❌ AI Analysis Error:", error);
    res.status(500).json({ success: false, error: "Failed to get AI analysis" });
  }
});


module.exports = router;
