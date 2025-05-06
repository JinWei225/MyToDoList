import { list, download } from '@vercel/blob';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    // Check if we already have a tasks file
    const { blobs } = await list({ prefix: 'tasks/' });
    const tasksBlob = blobs.find(blob => blob.pathname === 'tasks/tasks.json');
    
    if (tasksBlob) {
      // Get the tasks file
      const data = await download(tasksBlob.url);
      
      if (!data) {
        return new Response(JSON.stringify([]), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      // Parse JSON data
      const text = await data.text();
      
      return new Response(text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    } else {
      // No tasks file exists yet
      return new Response(JSON.stringify([]), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
  } catch (error) {
    console.error('Error getting tasks from blob:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}