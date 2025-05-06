import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Get the tasks data from the request body
    const tasks = req.body;
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Invalid tasks data' });
    }
    
    // Convert tasks to a JSON string
    const tasksJson = JSON.stringify(tasks);
    
    // Create a blob with the tasks data
    const blob = await put('tasks/tasks.json', tasksJson, {
      contentType: 'application/json',
      access: 'private', // Make the blob private so only your app can access it
    });
    
    return res.status(200).json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Error saving tasks to blob:', error);
    return res.status(500).json({ error: error.message });
  }
}