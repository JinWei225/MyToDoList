import { list, get } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    // Check if we already have a tasks file
    const { blobs } = await list({ prefix: 'tasks/' });
    const tasksBlob = blobs.find(blob => blob.pathname === 'tasks/tasks.json');
    
    if (tasksBlob) {
      // Get the tasks file
      const tasksBlobData = await get(tasksBlob.url);
      
      if (!tasksBlobData) {
        return res.status(404).json([]);
      }
      
      // Read the blob data
      const tasks = await tasksBlobData.json();
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