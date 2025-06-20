# Task Countdown To-Do App

A to-do list application with task countdown functionality and dark mode UI. This app saves your tasks in a JSON file.

## Features

- Dark mode interface
- Add tasks with due dates
- Real-time countdown to task deadlines
- Color-coded time indicators (green, yellow, red)
- Mark tasks as complete/incomplete
- Delete tasks
- Data saved in a JSON file

## Live Demo

*After deploying, you can add your live URL here*

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Deployment

This app is ready to deploy to various hosting services that support Node.js applications.

### Deployment Options

#### Render.com

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

#### Railway.app

1. Create a new project on Railway
2. Connect your GitHub repository
3. Railway will automatically detect your Node.js app

#### Fly.io

1. Install the Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch the app: `fly launch`
4. Deploy: `fly deploy`

### Environment Variables

The app supports the following environment variables:

- `PORT` - The port number (defaults to 3000)
- `DATA_DIR` - Custom directory for storing tasks.json (defaults to app root)

## File Structure

- `index.html` - The main HTML structure
- `styles.css` - All the styling for the application
- `script.js` - Client-side JavaScript that handles task management
- `server.js` - Node.js server that handles file operations and serves the app
- `tasks.json` - Where your tasks are stored (created automatically)
- `package.json` - Node.js project configuration

## Notes on Data Persistence

On some hosting platforms with ephemeral filesystems, the `tasks.json` file might be reset periodically. For production applications, consider upgrading to a proper database solution.

---

Created with ❤️ using Node.js and vanilla JavaScript