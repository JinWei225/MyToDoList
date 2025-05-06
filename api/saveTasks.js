// Import the correct client-side function for Edge Runtime
import { put } from '@vercel/blob/client';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Get the tasks data from the request body
    const tasks = await req.json();
    
    if (!Array.isArray(tasks)) {
      return new Response(JSON.stringify({ error: 'Invalid tasks data' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Convert tasks to a JSON string
    const tasksJson = JSON.stringify(tasks);
    
    // Create a blob with the tasks data
    const blob = await put('tasks/tasks.json', tasksJson, {
      contentType: 'application/json',
      access: 'private', // Make the blob private so only your app can access it
    });
    
    return new Response(JSON.stringify({ success: true, url: blob.url }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('Error saving tasks to blob:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}