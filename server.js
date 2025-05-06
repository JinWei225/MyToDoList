const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// JSON file path - ensure it works in various hosting environments
const dataDir = process.env.DATA_DIR || __dirname;
const dataFilePath = path.join(dataDir, 'tasks.json');

// Initialize tasks.json if it doesn't exist
try {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
    console.log(`Created new tasks.json file at ${dataFilePath}`);
  }
} catch (error) {
  console.error(`Error initializing tasks.json: ${error.message}`);
  // Continue anyway - we'll handle file access errors in the routes
}

// API endpoint to get all tasks
app.get('/api/tasks', (req, res) => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const tasks = JSON.parse(fs.readFileSync(dataFilePath));
      res.json(tasks);
    } else {
      // If file doesn't exist (might happen in some hosting environments)
      console.log('tasks.json not found, returning empty array');
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading tasks:', error);
    res.status(500).json({ error: 'Failed to read tasks', details: error.message });
  }
});

// API endpoint to save tasks
app.post('/api/tasks', (req, res) => {
  try {
    const tasks = req.body;
    fs.writeFileSync(dataFilePath, JSON.stringify(tasks, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving tasks:', error);
    res.status(500).json({ error: 'Failed to save tasks', details: error.message });
  }
});

// Health check endpoint (useful for hosting services)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all route to return the main app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Local URL: http://localhost:${PORT}`);
  console.log(`- Task data path: ${dataFilePath}`);
});