// api/tasks.js
const fs = require('fs').promises;
const path = require('path');

// Find the correct path to tasks.json, considering Vercel's environment
// In Vercel, __dirname points to the directory of the serverless function (api/)
// The 'data' directory is one level up from 'api'
const dataFilePath = path.resolve(process.cwd(), 'data', 'tasks.json');

// Helper function to read tasks
async function getTasks() {
    try {
        await fs.access(dataFilePath); // Check if file exists
        const data = await fs.readFile(dataFilePath, 'utf-8');
        return JSON.parse(data || '[]'); // Return empty array if file is empty
    } catch (error) {
        // If file doesn't exist, return empty array
        if (error.code === 'ENOENT') {
            return [];
        }
        console.error('Error reading tasks file:', error);
        throw error; // Re-throw other errors
    }
}

// Helper function to write tasks
async function saveTasks(tasks) {
    try {
        await fs.writeFile(dataFilePath, JSON.stringify(tasks, null, 2), 'utf-8'); // Pretty print JSON
    } catch (error) {
        console.error('Error writing tasks file:', error);
        throw error;
    }
}

// The main serverless function handler
module.exports = async (req, res) => {
    // Set CORS headers to allow requests from your frontend domain (and localhost)
    // Important for local development and production
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins (adjust in production if needed)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request (preflight request for CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            // --- GET ALL TASKS ---
            const tasks = await getTasks();
            res.status(200).json(tasks);

        } else if (req.method === 'POST') {
            // --- ADD NEW TASK or SUBTASK ---
            const tasks = await getTasks();
            const { text, dueDate, parentId } = req.body; // Get data from request body

            if (!text) {
                return res.status(400).json({ message: 'Task text is required' });
            }

            if (parentId) {
                // Add Subtask
                const parentTask = tasks.find(task => task.id === parentId);
                if (!parentTask) {
                    return res.status(404).json({ message: 'Parent task not found' });
                }
                if (!parentTask.subtasks) {
                    parentTask.subtasks = []; // Initialize subtasks array if it doesn't exist
                }
                const newSubtask = {
                    id: `sub_${Date.now()}_${Math.random().toString(16).slice(2)}`, // Unique ID for subtask
                    text: text,
                    completed: false
                };
                parentTask.subtasks.push(newSubtask);
            } else {
                // Add Main Task
                const newTask = {
                    id: `task_${Date.now()}_${Math.random().toString(16).slice(2)}`, // Unique ID
                    text: text,
                    createdAt: new Date().toISOString(),
                    dueDate: dueDate || null, // Store dueDate if provided
                    completed: false,
                    subtasks: [] // Initialize empty subtasks array
                };
                tasks.push(newTask);
            }

            await saveTasks(tasks);
            res.status(201).json({ message: parentId ? 'Subtask added' : 'Task added', tasks }); // Send back all tasks

        } else if (req.method === 'PUT') {
            // --- UPDATE TASK (e.g., mark complete, edit text/date) ---
            // Example: PUT /api/tasks?id=task_12345
            const taskId = req.query.id;
            const subtaskId = req.query.subtaskId; // Optional: for updating subtasks
            const { text, completed, dueDate } = req.body; // Fields that can be updated

            if (!taskId) {
                return res.status(400).json({ message: 'Task ID is required in query parameter' });
            }

            let tasks = await getTasks();
            let taskUpdated = false;

            tasks = tasks.map(task => {
                if (task.id === taskId) {
                    if (subtaskId) {
                        // Update Subtask
                        if (task.subtasks) {
                            task.subtasks = task.subtasks.map(sub => {
                                if (sub.id === subtaskId) {
                                    if (text !== undefined) sub.text = text;
                                    if (completed !== undefined) sub.completed = completed;
                                    taskUpdated = true;
                                }
                                return sub;
                            });
                        }
                    } else {
                        // Update Main Task
                        if (text !== undefined) task.text = text;
                        if (completed !== undefined) task.completed = completed;
                        if (dueDate !== undefined) task.dueDate = dueDate; // Allow updating due date
                        taskUpdated = true;
                    }
                }
                return task;
            });

            if (!taskUpdated) {
                return res.status(404).json({ message: 'Task or Subtask not found' });
            }

            await saveTasks(tasks);
            res.status(200).json({ message: 'Task updated', tasks });

        } else if (req.method === 'DELETE') {
            // --- DELETE TASK or SUBTASK ---
            // Example: DELETE /api/tasks?id=task_12345
            // Example: DELETE /api/tasks?id=task_12345&subtaskId=sub_67890
            const taskId = req.query.id;
            const subtaskId = req.query.subtaskId; // Optional: for deleting subtasks

            if (!taskId) {
                return res.status(400).json({ message: 'Task ID is required in query parameter' });
            }

            let tasks = await getTasks();
            let initialLength = tasks.reduce((acc, t) => acc + 1 + (t.subtasks?.length || 0), 0);
            let taskDeleted = false;

            if (subtaskId) {
                // Delete Subtask
                 tasks = tasks.map(task => {
                    if (task.id === taskId && task.subtasks) {
                        const initialSubtaskLength = task.subtasks.length;
                        task.subtasks = task.subtasks.filter(sub => sub.id !== subtaskId);
                        if (task.subtasks.length < initialSubtaskLength) {
                            taskDeleted = true; // Mark that a subtask was deleted
                        }
                    }
                    return task;
                });
            } else {
                // Delete Main Task
                const filteredTasks = tasks.filter(task => task.id !== taskId);
                 if (filteredTasks.length < tasks.length) {
                     taskDeleted = true; // Mark that a main task was deleted
                     tasks = filteredTasks;
                 }
            }

            if (!taskDeleted) {
                return res.status(404).json({ message: 'Task or Subtask not found' });
            }

            await saveTasks(tasks);
            res.status(200).json({ message: subtaskId ? 'Subtask deleted' : 'Task deleted', tasks });

        } else {
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error('Server Error:', error);
        // Avoid sending detailed error messages to the client in production
        res.status(500).json({ message: 'Internal Server Error' });
    }
};