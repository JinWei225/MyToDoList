// Standard Node.js API route
import { list } from '@vercel/blob';

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if we already have a tasks file
    const { blobs } = await list({ prefix: 'tasks/' });
    const tasksBlob = blobs.find(blob => blob.pathname === 'tasks/tasks.json');
    
    if (tasksBlob) {
      try {
        // Fetch the content using the URL directly
        const response = await fetch(tasksBlob.url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
        }
        
        // Parse the JSON response
        const tasks = await response.json();
        return res.status(200).json(tasks);
      } catch (fetchError) {
        console.error('Error fetching or parsing tasks:', fetchError);
        return res.status(500).json({ error: fetchError.message });
      }
    } else {
      // No tasks file exists yet
      return res.status(200).json([]);
    }
  } catch (error) {
    console.error('Error getting tasks from blob:', error);
    return res.status(500).json({ error: error.message });
  }
}