// Standard Node.js Serverless Function
import { put } from '@vercel/blob';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get the tasks data from the request body
    const tasks = req.body;
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Invalid tasks data' });
    }
    
    // Convert tasks to a JSON string
    const tasksJson = JSON.stringify(tasks, null, 2); // Pretty-print for better readability
    
    // Create a blob with the tasks data
    const blob = await put('tasks/tasks.json', tasksJson, {
      contentType: 'application/json',
      access: 'public', // Make the blob private so only your app can access it
    });
    
    return res.status(200).json({ 
      success: true, 
      url: blob.url,
      message: `Successfully saved ${tasks.length} tasks`
    });
  } catch (error) {
    console.error('Error saving tasks to blob:', error);
    return res.status(500).json({ error: error.message });
  }
}