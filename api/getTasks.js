// Standard Node.js API route (not Edge function)
import { list, get } from '@vercel/blob';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
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
    // Check if we already have a tasks file
    const { blobs } = await list();
    const tasksBlob = blobs.find(blob => blob.pathname === 'tasks/tasks.json');
    
    if (tasksBlob) {
      // Get the tasks file content
      const tasksBlobData = await get(tasksBlob.url);
      
      if (!tasksBlobData) {
        return res.status(200).json([]);
      }
      
      // Download the blob data as text
      const tasksText = await tasksBlobData.text();
      // Parse the JSON
      const tasks = JSON.parse(tasksText);
      return res.status(200).json(tasks);
    } else {
      // No tasks file exists yet
      return res.status(200).json([]);
    }
  } catch (error) {
    console.error('Error getting tasks from blob:', error);
    return res.status(500).json({ error: error.message });
  }
}