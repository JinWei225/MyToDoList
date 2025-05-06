// DOM Elements
const taskTitleInput = document.getElementById('taskTitle');
const dueDateInput = document.getElementById('dueDate');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskListContainer = document.getElementById('taskList');

// Set minimum date to today
const today = new Date();
const formattedDate = today.toISOString().slice(0, 16);
dueDateInput.min = formattedDate;
dueDateInput.value = formattedDate;

// Task array
let tasks = [];

// Load tasks from server
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
            tasks = await response.json();
            renderTasks();
        } else {
            console.error('Failed to load tasks', await response.text());
        }
    } catch (error) {
        console.error("Error loading tasks:", error);
        const savedTasks = localStorage.getItem('countdown-tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
            renderTasks();
        }
    }
    
}

// Save tasks to server
async function saveTasks() {
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tasks)
        });
        
        if (!response.ok) {
            console.error('Failed to save tasks:', await response.text());
            // Fallback to localStorage if server save fails
            localStorage.setItem('countdown-tasks', JSON.stringify(tasks));
        }
    } catch (error) {
        console.error('Error saving tasks:', error);
        // Fallback to localStorage if server is not available
        localStorage.setItem('countdown-tasks', JSON.stringify(tasks));
    }
}

// Generate a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Add a new task
function addTask() {
    const title = taskTitleInput.value.trim();
    const dueDate = dueDateInput.value;
    
    if (!title || !dueDate) {
        alert('Please enter a task title and due date');
        return;
    }
    
    const newTask = {
        id: generateId(),
        title,
        dueDate: new Date(dueDate).getTime(),
        completed: false,
        createdAt: Date.now()
    };
    
    tasks.push(newTask);
    saveTasks();
    renderTasks();
    
    // Reset form
    taskTitleInput.value = '';
    dueDateInput.value = formattedDate;
    taskTitleInput.focus();
}

// Format time remaining
function formatTimeRemaining(dueDate) {
    const now = Date.now();
    const timeRemaining = dueDate - now;
    
    if (timeRemaining <= 0) {
        return {
            text: 'Overdue!',
            class: 'urgent'
        };
    }
    
    // Calculate time units
    const seconds = Math.floor(timeRemaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let formattedTime = '';
    let timeClass = 'plenty';
    
    if (days > 0) {
        formattedTime = `${days} day${days > 1 ? 's' : ''}`;
        if (days === 1) {
            timeClass = 'soon';
        }
    } else if (hours > 0) {
        formattedTime = `${hours} hour${hours > 1 ? 's' : ''}`;
        timeClass = 'soon';
    } else if (minutes > 0) {
        formattedTime = `${minutes} minute${minutes > 1 ? 's' : ''}`;
        timeClass = 'urgent';
    } else {
        formattedTime = `${seconds} second${seconds !== 1 ? 's' : ''}`;
        timeClass = 'urgent';
    }
    
    return {
        text: `${formattedTime} remaining`,
        class: timeClass
    };
}

// Format date for display
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Delete a task
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
}

// Toggle task completion
function toggleComplete(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    saveTasks();
    renderTasks();
}

// Render all tasks
function renderTasks() {
    if (tasks.length === 0) {
        taskListContainer.innerHTML = '<div class="no-tasks">No tasks yet. Add some tasks to get started!</div>';
        return;
    }
    
    // Sort tasks: incomplete first, then by due date
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return a.dueDate - b.dueDate;
    });
    
    taskListContainer.innerHTML = sortedTasks.map(task => {
        const timeInfo = formatTimeRemaining(task.dueDate);
        return `
            <div class="task-card ${task.completed ? 'completed' : ''}">
                <div class="task-info">
                    <h3 class="task-title">${task.title}</h3>
                    <div class="task-date">Due: ${formatDate(task.dueDate)}</div>
                    ${!task.completed ? `<div class="countdown ${timeInfo.class}">${timeInfo.text}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="btn ${task.completed ? '' : 'btn-complete'}" onclick="toggleComplete('${task.id}')">
                        ${task.completed ? 'Undo' : 'Complete'}
                    </button>
                    <button class="btn btn-delete" onclick="deleteTask('${task.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Initialize
function init() {
    loadTasks();
    
    // Event listeners
    addTaskBtn.addEventListener('click', addTask);
    taskTitleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    // Update countdowns every second
    setInterval(renderTasks, 1000);
}

// Make functions available globally for onclick handlers
window.deleteTask = deleteTask;
window.toggleComplete = toggleComplete;

// Start the app
document.addEventListener('DOMContentLoaded', init);