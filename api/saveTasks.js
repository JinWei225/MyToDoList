// Standard Node.js API Route
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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Save all tasks
    if (req.method === 'POST') {
      // Get the tasks data from the request body
      const tasks = req.body;
      
      if (!Array.isArray(tasks)) {
        return res.status(400).json({ error: 'Invalid tasks data' });
      }
      
      // Validate each task has required fields and subtasks array
      for (const task of tasks) {
        if (!task.id || !task.title) {
          return res.status(400).json({ error: 'Each task must have id and title' });
        }
        
        // Ensure subtasks array exists
        if (!task.subtasks) {
          task.subtasks = [];
        }
        
        // Validate each subtask
        if (Array.isArray(task.subtasks)) {
          for (const subtask of task.subtasks) {
            if (!subtask.id || !subtask.title) {
              return res.status(400).json({ error: 'Each subtask must have id and title' });
            }
          }
        }
      }
      
      // Convert tasks to a JSON string
      const tasksJson = JSON.stringify(tasks, null, 2);
      
      // Create a blob with the tasks data
      const blob = await put('tasks/tasks.json', tasksJson, {
        contentType: 'application/json',
        access: 'public',
      });
      
      return res.status(200).json({ 
        success: true, 
        url: blob.url,
        message: `Successfully saved ${tasks.length} tasks`
      });
    }
    
    // Update a specific task
    else if (req.method === 'PUT') {
      const taskUpdate = req.body;
      
      if (!taskUpdate || !taskUpdate.id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      // Get existing tasks
      const { blobs } = await list({ prefix: 'tasks/' });
      const tasksBlob = blobs.find(blob => blob.pathname === 'tasks/tasks.json');
      
      let tasks = [];
      if (tasksBlob) {
        const response = await fetch(tasksBlob.url);
        if (response.ok) {
          tasks = await response.json();
        }
      }
      
      // Find the task to update
      const taskIndex = tasks.findIndex(task => task.id === taskUpdate.id);
      
      if (taskIndex === -1) {
        // Add new task
        if (!taskUpdate.title) {
          return res.status(400).json({ error: 'New task must have a title' });
        }
        
        // Ensure subtasks array exists
        if (!taskUpdate.subtasks) {
          taskUpdate.subtasks = [];
        }
        
        tasks.push(taskUpdate);
      } else {
        // Update existing task
        if (taskUpdate.title !== undefined) {
          tasks[taskIndex].title = taskUpdate.title;
        }
        if (taskUpdate.completed !== undefined) {
          tasks[taskIndex].completed = taskUpdate.completed;
        }
        if (taskUpdate.dueDate !== undefined) {
          tasks[taskIndex].dueDate = taskUpdate.dueDate;
        }
        if (taskUpdate.priority !== undefined) {
          tasks[taskIndex].priority = taskUpdate.priority;
        }
        if (taskUpdate.subtasks !== undefined) {
          tasks[taskIndex].subtasks = taskUpdate.subtasks;
        }
      }
      
      // Save updated tasks
      const tasksJson = JSON.stringify(tasks, null, 2);
      const blob = await put('tasks/tasks.json', tasksJson, {
        contentType: 'application/json',
        access: 'public',
      });
      
      return res.status(200).json({ 
        success: true, 
        url: blob.url,
        message: taskIndex === -1 ? 'Task added successfully' : 'Task updated successfully'
      });
    }
    
    // Delete a task
    else if (req.method === 'DELETE') {
      const { taskId, subtaskId } = req.query;
      
      if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
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
      
      // If subtaskId is provided, delete the subtask instead of the whole task
      if (subtaskId) {
        if (!tasks[taskIndex].subtasks) {
          return res.status(404).json({ error: 'Subtasks array not found' });
        }
        
        const subtaskIndex = tasks[taskIndex].subtasks.findIndex(
          subtask => subtask.id === subtaskId
        );
        
        if (subtaskIndex === -1) {
          return res.status(404).json({ error: `Subtask with ID ${subtaskId} not found` });
        }
        
        tasks[taskIndex].subtasks.splice(subtaskIndex, 1);
      } else {
        // Delete the entire task
        tasks.splice(taskIndex, 1);
      }
      
      // Save updated tasks
      const tasksJson = JSON.stringify(tasks, null, 2);
      const blob = await put('tasks/tasks.json', tasksJson, {
        contentType: 'application/json',
        access: 'public',
      });
      
      return res.status(200).json({ 
        success: true, 
        message: subtaskId 
          ? `Subtask with ID ${subtaskId} deleted successfully` 
          : `Task with ID ${taskId} deleted successfully`
      });
    }
    
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error saving tasks to blob:', error);
    return res.status(500).json({ error: error.message });
  }
}