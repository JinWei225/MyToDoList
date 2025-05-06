// DOM Elements
const taskTitleInput = document.getElementById('taskTitle');
const dueDateInput = document.getElementById('dueDate');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskListContainer = document.getElementById('taskList');
const statusMessage = document.getElementById('statusMessage') || document.createElement('div');

// Subtask Modal Elements
const subtaskModal = document.getElementById('subtaskModal');
const subtaskTitleInput = document.getElementById('subtaskTitle');
const addSubtaskBtn = document.getElementById('addSubtaskBtn');
const subtaskListContainer = document.getElementById('subtaskList');
const closeSubtaskModalBtn = document.getElementById('closeSubtaskModal');
const closeModalX = document.querySelector('.close-modal');

// Current active task for subtasks
let currentTaskId = null;

// Ensure we have a status message element
if (!document.getElementById('statusMessage')) {
    statusMessage.id = 'statusMessage';
    statusMessage.className = 'status-message';
    document.querySelector('.task-form').appendChild(statusMessage);
}

// Set minimum date to today
const today = new Date();
const formattedDate = today.toISOString().slice(0, 16);
dueDateInput.min = formattedDate;
dueDateInput.value = formattedDate;

// Task array
let tasks = [];

// Load tasks from Vercel Blob
async function loadTasks() {
    try {
        showStatus('Loading tasks...', 'info');
        const response = await fetch('/api/getTasks');
        
        if (response.ok) {
            tasks = await response.json();
            renderTasks();
            showStatus('Tasks loaded successfully', 'success', 2000);
        } else {
            const errorText = await response.text();
            console.error('Failed to load tasks:', errorText);
            showStatus('Failed to load tasks from cloud storage', 'error');
            
            // Fallback to localStorage if server is not available
            loadFromLocalStorage();
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showStatus('Failed to connect to server', 'error');
        
        // Fallback to localStorage if server is not available
        loadFromLocalStorage();
    }
}

// Load from localStorage as fallback
function loadFromLocalStorage() {
    const savedTasks = localStorage.getItem('countdown-tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        renderTasks();
        showStatus('Tasks loaded from local storage', 'info', 2000);
    }
}

// Save tasks to Vercel Blob
async function saveTasks() {
    try {
        showStatus('Saving tasks...', 'info');
        const response = await fetch('/api/saveTasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tasks)
        });
        
        if (response.ok) {
            showStatus('Tasks saved to cloud storage', 'success', 2000);
        } else {
            const errorText = await response.text();
            console.error('Failed to save tasks:', errorText);
            showStatus('Failed to save to cloud, using local backup', 'warning');
            
            // Fallback to localStorage
            localStorage.setItem('countdown-tasks', JSON.stringify(tasks));
        }
    } catch (error) {
        console.error('Error saving tasks:', error);
        showStatus('Network error, using local backup', 'error');
        
        // Fallback to localStorage
        localStorage.setItem('countdown-tasks', JSON.stringify(tasks));
    }
}

// Show status message
function showStatus(message, type = 'info', duration = 0) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    if (duration > 0) {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, duration);
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
        showStatus('Please enter a task title and due date', 'error', 3000);
        return;
    }
    
    const newTask = {
        id: generateId(),
        title,
        dueDate: new Date(dueDate).getTime(),
        completed: false,
        createdAt: Date.now(),
        subtasks: []
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
        const subtasksCount = task.subtasks ? task.subtasks.length : 0;
        const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
        
        return `
            <div class="task-card ${task.completed ? 'completed' : ''}">
                <div class="task-info">
                    <h3 class="task-title">
                        ${task.title}
                        ${subtasksCount > 0 ? `<span class="subtask-count">${completedSubtasks}/${subtasksCount}</span>` : ''}
                    </h3>
                    <div class="task-date">Due: ${formatDate(task.dueDate)}</div>
                    ${!task.completed ? `<div class="countdown ${timeInfo.class}">${timeInfo.text}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="btn btn-subtasks" onclick="openSubtasks('${task.id}')">
                        Subtasks
                    </button>
                    <button class="btn ${task.completed ? '' : 'btn-complete'}" onclick="toggleComplete('${task.id}')">
                        ${task.completed ? 'Undo' : 'Complete'}
                    </button>
                    <button class="btn btn-delete" onclick="deleteTask('${task.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Open subtasks modal
function openSubtasks(taskId) {
    currentTaskId = taskId;
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
        showStatus('Task not found', 'error', 3000);
        return;
    }
    
    // Set modal title
    const modalTitle = subtaskModal.querySelector('h2');
    modalTitle.textContent = `Subtasks for: ${task.title}`;
    
    // Clear input
    subtaskTitleInput.value = '';
    
    // Render subtasks
    renderSubtasks(task.subtasks || []);
    
    // Show modal
    subtaskModal.style.display = 'block';
}

// Close subtasks modal
function closeSubtasks() {
    subtaskModal.style.display = 'none';
    currentTaskId = null;
}

// Render subtasks in the modal
function renderSubtasks(subtasks) {
    if (!subtasks || subtasks.length === 0) {
        subtaskListContainer.innerHTML = '<div class="no-subtasks">No subtasks yet. Add some subtasks to break down this task.</div>';
        return;
    }
    
    subtaskListContainer.innerHTML = subtasks.map(subtask => `
        <div class="subtask-item">
            <input 
                type="checkbox" 
                class="subtask-checkbox" 
                id="subtask-${subtask.id}" 
                ${subtask.completed ? 'checked' : ''}
                onchange="toggleSubtaskComplete('${subtask.id}')"
            >
            <label 
                for="subtask-${subtask.id}" 
                class="subtask-title ${subtask.completed ? 'subtask-completed' : ''}"
            >
                ${subtask.title}
            </label>
            <div class="subtask-actions">
                <button class="btn btn-delete" onclick="deleteSubtask('${subtask.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Add a new subtask
async function addSubtask() {
    if (!currentTaskId) {
        showSubtaskStatus('No task selected', 'error');
        return;
    }
    
    const title = subtaskTitleInput.value.trim();
    if (!title) {
        showSubtaskStatus('Please enter a subtask title', 'error');
        return;
    }
    
    // Create subtask object
    const newSubtask = {
        id: generateId(),
        title: title,
        completed: false
    };
    
    try {
        // Send to API
        const response = await fetch(`/api/subtasks?taskId=${currentTaskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newSubtask)
        });
        
        if (response.ok) {
            // Update local task
            const taskIndex = tasks.findIndex(task => task.id === currentTaskId);
            if (taskIndex !== -1) {
                if (!tasks[taskIndex].subtasks) {
                    tasks[taskIndex].subtasks = [];
                }
                tasks[taskIndex].subtasks.push(newSubtask);
                
                // Re-render subtasks
                renderSubtasks(tasks[taskIndex].subtasks);
                
                // Re-render main task list to update subtask count
                renderTasks();
                
                // Clear input
                subtaskTitleInput.value = '';
                subtaskTitleInput.focus();
                
                showSubtaskStatus('Subtask added successfully', 'success');
            }
        } else {
            const errorData = await response.json();
            showSubtaskStatus(`Error: ${errorData.error}`, 'error');
        }
    } catch (error) {
        console.error('Error adding subtask:', error);
        showSubtaskStatus('Failed to add subtask', 'error');
        
        // Fallback: add locally and try to save all tasks
        const taskIndex = tasks.findIndex(task => task.id === currentTaskId);
        if (taskIndex !== -1) {
            if (!tasks[taskIndex].subtasks) {
                tasks[taskIndex].subtasks = [];
            }
            tasks[taskIndex].subtasks.push(newSubtask);
            saveTasks();
            renderSubtasks(tasks[taskIndex].subtasks);
            renderTasks();
            subtaskTitleInput.value = '';
            subtaskTitleInput.focus();
        }
    }
}

// Toggle subtask completion
async function toggleSubtaskComplete(subtaskId) {
    if (!currentTaskId) return;
    
    // Find the task and subtask
    const taskIndex = tasks.findIndex(task => task.id === currentTaskId);
    if (taskIndex === -1) return;
    
    const subtaskIndex = tasks[taskIndex].subtasks.findIndex(st => st.id === subtaskId);
    if (subtaskIndex === -1) return;
    
    // Toggle completion status
    const newCompletedState = !tasks[taskIndex].subtasks[subtaskIndex].completed;
    
    try {
        // Update via API
        const response = await fetch(`/api/subtasks?taskId=${currentTaskId}&subtaskId=${subtaskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                completed: newCompletedState
            })
        });
        
        if (response.ok) {
            // Update local state
            tasks[taskIndex].subtasks[subtaskIndex].completed = newCompletedState;
            
            // Re-render
            renderSubtasks(tasks[taskIndex].subtasks);
            renderTasks();
        } else {
            const errorData = await response.json();
            showSubtaskStatus(`Error: ${errorData.error}`, 'error');
            
            // Revert checkbox state
            document.getElementById(`subtask-${subtaskId}`).checked = 
                tasks[taskIndex].subtasks[subtaskIndex].completed;
        }
    } catch (error) {
        console.error('Error toggling subtask completion:', error);
        
        // Fallback: update locally
        tasks[taskIndex].subtasks[subtaskIndex].completed = newCompletedState;
        saveTasks();
        renderSubtasks(tasks[taskIndex].subtasks);
        renderTasks();
    }
}

// Delete a subtask
async function deleteSubtask(subtaskId) {
    if (!currentTaskId) return;
    
    try {
        // Delete via API
        const response = await fetch(`/api/saveTasks?taskId=${currentTaskId}&subtaskId=${subtaskId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Update local state
            const taskIndex = tasks.findIndex(task => task.id === currentTaskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].subtasks = tasks[taskIndex].subtasks.filter(st => st.id !== subtaskId);
                
                // Re-render
                renderSubtasks(tasks[taskIndex].subtasks);
                renderTasks();
                
                showSubtaskStatus('Subtask deleted', 'success');
            }
        } else {
            const errorData = await response.json();
            showSubtaskStatus(`Error: ${errorData.error}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting subtask:', error);
        
        // Fallback: delete locally
        const taskIndex = tasks.findIndex(task => task.id === currentTaskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].subtasks = tasks[taskIndex].subtasks.filter(st => st.id !== subtaskId);
            saveTasks();
            renderSubtasks(tasks[taskIndex].subtasks);
            renderTasks();
        }
    }
}

// Show status message in the subtask modal
function showSubtaskStatus(message, type = 'info') {
    let statusElement = document.querySelector('.subtask-status');
    
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'subtask-status';
        subtaskListContainer.before(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.className = `subtask-status ${type}`;
    
    // Clear message after 3 seconds
    setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'subtask-status';
    }, 3000);
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
    
    // Subtask modal events
    addSubtaskBtn.addEventListener('click', addSubtask);
    subtaskTitleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addSubtask();
        }
    });
    closeSubtaskModalBtn.addEventListener('click', closeSubtasks);
    closeModalX.addEventListener('click', closeSubtasks);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === subtaskModal) {
            closeSubtasks();
        }
    });
    
    // Update countdowns every second
    setInterval(renderTasks, 1000);
}

// Make functions available globally for onclick handlers
window.deleteTask = deleteTask;
window.toggleComplete = toggleComplete;
window.openSubtasks = openSubtasks;
window.toggleSubtaskComplete = toggleSubtaskComplete;
window.deleteSubtask = deleteSubtask;

// Start the app
document.addEventListener('DOMContentLoaded', init);