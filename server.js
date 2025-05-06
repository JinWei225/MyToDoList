const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON file
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// JSON file path
const dataFilePath = path.join(__dirname, 'tasks.json');

// Initialize task.json if it does not exist
if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
}

// API endpoint to get all tasks
app.get('/api/tasks', (req, res) => {
    try {
        const tasks = JSON.parse(fs.readFileSync(dataFilePath));
        res.json(tasks);
    } catch (error) {
        console.error('Error reading tasks', error);
        res.status(500).json({error: 'Failed to read tasks'});
    }
});

// API endpoint to save tasks
app.post('/api/tasks', (req, res) => {
    try {
        const tasks = req.body;
        fs.writeFileSync(dataFilePath, JSON.stringify(tasks, null, 2));
        res.json({success: true});
    } catch (error) {
        console.error('Error saving tasks', error);
        res.status(500).json({error: 'Failed to save tasks'});
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Task data is stored at ${dataFilePath}`);
})