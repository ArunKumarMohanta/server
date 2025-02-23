require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const analyzeRoutes = require('./routes/analyze');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001; // Use Render's port if available

// CORS setup (allow requests from frontend hosted on GitHub Pages)
app.use(cors());
app.options('*', cors()); // Allows preflight requests globally

app.use(bodyParser.json({ limit: '10mb' }));

// Use modular routes
app.use('/analyze', analyzeRoutes);
app.use('/upload', uploadRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
