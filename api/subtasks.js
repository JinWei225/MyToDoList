// Standard Node.js API Route for managing subtasks
import { put, list } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,PUT,DELETE,GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get task ID from query parameters
  const { taskId, subtaskId } = req.query;
  
  if (!taskId) {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  try {
    // Get existing tasks
    const { blobs } = await list({ prefix: 'tasks/' });
    const tasksBlob = blobs.find(blob => blob.pathname === 'tasks/tasks.json');
    
    if (!tasksBlob) {
      return res.status(404).json({ error: 'Tasks not found' });
    }
    
    const response = await fetch(tasksBlob.url);
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
    
    const tasks = await response.json();
    
    // Find the task
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: `Task with ID ${taskId} not found` });
    }
    
    // Ensure subtasks array exists
    if (!tasks[taskIndex].subtasks) {
      tasks[taskIndex].subtasks = [];
    }
    
    // GET - List subtasks for a specific task
    if (req.method === 'GET') {
      if (subtaskId) {
        // Return a specific subtask
        const subtask = tasks[taskIndex].subtasks.find(st => st.id === subtaskId);
        if (!subtask) {
          return res.status(404).json({ error: `Subtask with ID ${subtaskId} not found` });
        }
        return res.status(200).json(subtask);
      }
      
      // Return all subtasks for the task
      return res.status(200).json(tasks[taskIndex].subtasks);
    }
    
    // POST - Add a new subtask
    else if (req.method === 'POST') {
      const subtask = req.body;
      
      if (!subtask || !subtask.title) {
        return res.status(400).json({ error: 'Subtask title is required' });
      }
      
      // Generate an ID if not provided
      if (!subtask.id) {
        subtask.id = `subtask_${Date.now()}`;
      }
      
      // Set default completed status if not provided
      if (subtask.completed === undefined) {
        subtask.completed = false;
      }
      
      // Add the subtask
      tasks[taskIndex].subtasks.push(subtask);
      
      // Save updated tasks
      const tasksJson = JSON.stringify(tasks, null, 2);
      const blob = await put('tasks/tasks.json', tasksJson, {
        contentType: 'application/json',
        access: 'public',
        allowOverwrite:true
      });
      
      return res.status(201).json({ 
        success: true, 
        subtask,
        message: 'Subtask added successfully'
      });
    }
    
    // PUT - Update a subtask
    else if (req.method === 'PUT') {
      if (!subtaskId) {
        return res.status(400).json({ error: 'Subtask ID is required' });
      }
      
      const update = req.body;
      
      // Find the subtask
      const subtaskIndex = tasks[taskIndex].subtasks.findIndex(st => st.id === subtaskId);
      
      if (subtaskIndex === -1) {
        return res.status(404).json({ error: `Subtask with ID ${subtaskId} not found` });
      }
      
      // Update the subtask properties
      if (update.title !== undefined) {
        tasks[taskIndex].subtasks[subtaskIndex].title = update.title;
      }
      if (update.completed !== undefined) {
        tasks[taskIndex].subtasks[subtaskIndex].completed = update.completed;
      }
      if (update.dueDate !== undefined) {
        tasks[taskIndex].subtasks[subtaskIndex].dueDate = update.dueDate;
      }
      
      // Save updated tasks
      const tasksJson = JSON.stringify(tasks, null, 2);
      const blob = await put('tasks/tasks.json', tasksJson, {
        contentType: 'application/json',
        access: 'public',
        allowOverwrite:true
      });
      
      return res.status(200).json({ 
        success: true, 
        subtask: tasks[taskIndex].subtasks[subtaskIndex],
        message: 'Subtask updated successfully'
      });
    }
    
    // DELETE - Delete a subtask
    else if (req.method === 'DELETE') {
      if (!subtaskId) {
        return res.status(400).json({ error: 'Subtask ID is required' });
      }
      
      // Find the subtask
      const subtaskIndex = tasks[taskIndex].subtasks.findIndex(st => st.id === subtaskId);
      
      if (subtaskIndex === -1) {
        return res.status(404).json({ error: `Subtask with ID ${subtaskId} not found` });
      }
      
      // Remove the subtask
      tasks[taskIndex].subtasks.splice(subtaskIndex, 1);
      
      // Save updated tasks
      const tasksJson = JSON.stringify(tasks, null, 2);
      const blob = await put('tasks/tasks.json', tasksJson, {
        contentType: 'application/json',
        access: 'public',
        allowOverwrite:true
      });
      
      return res.status(200).json({ 
        success: true, 
        message: `Subtask with ID ${subtaskId} deleted successfully`
      });
    }
    
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error managing subtasks:', error);
    return res.status(500).json({ error: error.message });
  }
}