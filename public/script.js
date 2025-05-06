document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('task-list');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskTextInput = document.getElementById('task-text');
    const taskDueDateInput = document.getElementById('task-due-date');

    // Subtask Modal Elements
    const subtaskModal = document.getElementById('subtask-modal');
    const addSubtaskBtn = document.getElementById('add-subtask-confirm-btn');
    const subtaskTextInput = document.getElementById('subtask-text');
    const parentTaskIdInput = document.getElementById('parent-task-id');
    const closeModalBtn = subtaskModal.querySelector('.close-btn');

    // Use the Vercel deployment URL or localhost for development
    // When deployed, Vercel automatically sets the environment variable VERCEL_URL
    // For local testing, you'll likely run the frontend via a simple server (like `npx serve public`)
    // and the backend via `vercel dev`. The API will be at http://localhost:3000/api/tasks usually.
    // You might need to adjust this baseURL depending on your local setup.
    // Using relative path '/api/tasks' usually works well in both environments.
    const API_BASE_URL = '/api/tasks';

    let countdownIntervals = []; // Store interval IDs to clear them later

    // --- Core Functions ---

    // Fetch tasks from the backend
    async function fetchTasks() {
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            taskList.innerHTML = '<li style="color: var(--error-color);">Failed to load tasks. Please try again later.</li>';
        }
    }

    // Render tasks and subtasks to the page
    function renderTasks(tasks) {
        taskList.innerHTML = ''; // Clear existing list
        clearCountdownIntervals(); // Clear old intervals before rendering new ones

        if (!tasks || tasks.length === 0) {
            taskList.innerHTML = '<li>No tasks yet. Add one above!</li>';
            return;
        }

        tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Sort by creation date

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.dataset.taskId = task.id; // Store task ID on the element

            const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
            const formattedDueDate = dueDateObj
                ? `${dueDateObj.toLocaleDateString()} ${dueDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'No due date';

            // Format Created Date (Optional)
            // const createdDateObj = new Date(task.createdAt);
            // const formattedCreatedDate = `${createdDateObj.toLocaleDateString()} ${createdDateObj.toLocaleTimeString()}`;

            li.innerHTML = `
                <div class="task-main">
                    <div class="task-content">
                        <input type="checkbox" class="task-complete-checkbox" ${task.completed ? 'checked' : ''}>
                        <div>
                             <span class="task-text">${escapeHTML(task.text)}</span>
                             <div class="task-meta">
                                 ${dueDateObj ? `Due: ${formattedDueDate}` : ''}
                                 <span class="countdown" data-due-date="${task.dueDate || ''}"></span>
                             </div>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="add-subtask-btn">Subtask +</button>
                        <button class="delete-btn">Delete</button>
                    </div>
                </div>
                <ul class="subtask-list">
                    ${renderSubtasks(task.subtasks || [], task.id)}
                </ul>
            `;

            taskList.appendChild(li);

            // Add countdown timer if due date exists and is valid
            if (dueDateObj && !isNaN(dueDateObj)) {
                const countdownElement = li.querySelector('.countdown');
                updateCountdown(countdownElement, dueDateObj); // Initial update
                // Store interval ID to clear later
                countdownIntervals.push(setInterval(() => updateCountdown(countdownElement, dueDateObj), 1000));
            } else if (dueDateObj && isNaN(dueDateObj)){
                 const countdownElement = li.querySelector('.countdown');
                 if(countdownElement) countdownElement.textContent = "(Invalid Date)";
            }
        });
    }

     // Render subtasks for a given parent task
    function renderSubtasks(subtasks, parentTaskId) {
        if (!subtasks || subtasks.length === 0) {
            return ''; // No subtasks to render
        }
        return subtasks.map(subtask => `
            <li class="subtask-item ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}" data-parent-id="${parentTaskId}">
                <div class="subtask-content">
                    <input type="checkbox" class="subtask-complete-checkbox" ${subtask.completed ? 'checked' : ''}>
                    <span class="subtask-text">${escapeHTML(subtask.text)}</span>
                </div>
                <div class="subtask-actions">
                    <button class="delete-subtask-btn">Delete</button>
                </div>
            </li>
        `).join('');
    }


    // Add a new task
    async function addTask() {
        const text = taskTextInput.value.trim();
        const dueDate = taskDueDateInput.value; // Format: YYYY-MM-DDTHH:mm

        if (!text) {
            alert('Please enter task text.');
            return;
        }

        const newTaskData = { text, dueDate: dueDate || null }; // Send null if no date

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTaskData),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message}`);
            }

            const result = await response.json();
            renderTasks(result.tasks); // Re-render the list with the new task included
            taskTextInput.value = ''; // Clear input fields
            taskDueDateInput.value = '';

        } catch (error) {
            console.error('Error adding task:', error);
            alert(`Failed to add task: ${error.message}`);
        }
    }

    // Add a new subtask
    async function addSubtask() {
        const parentId = parentTaskIdInput.value;
        const text = subtaskTextInput.value.trim();

        if (!text || !parentId) {
            alert('Please enter subtask text.');
            return;
        }

         const newSubtaskData = { text, parentId };

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSubtaskData),
            });

             if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message}`);
            }

            const result = await response.json();
            renderTasks(result.tasks); // Re-render the whole list
            closeSubtaskModal(); // Close modal on success

        } catch (error) {
             console.error('Error adding subtask:', error);
            alert(`Failed to add subtask: ${error.message}`);
        }
    }


    // Update task (completion status)
    async function updateTask(taskId, subtaskId, updates) {
         // Construct the query string carefully
        let queryString = `?id=${encodeURIComponent(taskId)}`;
        if (subtaskId) {
            queryString += `&subtaskId=${encodeURIComponent(subtaskId)}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${queryString}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message}`);
            }

            const result = await response.json();
            renderTasks(result.tasks); // Re-render list after update

        } catch (error) {
            console.error('Error updating task:', error);
            alert(`Failed to update task: ${error.message}`);
            // Optional: Re-fetch tasks to revert optimistic UI update on error
            // fetchTasks();
        }
    }


    // Delete a task or subtask
    async function deleteTask(taskId, subtaskId = null) {
         // Construct the query string carefully
        let queryString = `?id=${encodeURIComponent(taskId)}`;
        if (subtaskId) {
            queryString += `&subtaskId=${encodeURIComponent(subtaskId)}`;
        }

        // Confirmation dialog
        const confirmMessage = subtaskId
            ? 'Are you sure you want to delete this subtask?'
            : 'Are you sure you want to delete this task and all its subtasks?';
        if (!confirm(confirmMessage)) {
            return; // User cancelled
        }

        try {
            const response = await fetch(`${API_BASE_URL}${queryString}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const result = await response.json();
            renderTasks(result.tasks); // Re-render list after deletion

        } catch (error) {
            console.error('Error deleting task:', error);
            alert(`Failed to delete task: ${error.message}`);
        }
    }


    // --- Countdown Logic ---
    function updateCountdown(element, dueDate) {
        if (!element || !dueDate) return;

        const now = new Date();
        const diff = dueDate.getTime() - now.getTime();

        // Clear previous content and classes
        element.textContent = '';
        element.classList.remove('past', 'soon', 'far');

        if (diff < 0) {
            element.textContent = 'Past Due';
            element.classList.add('past');
            return; // Stop countdown if past due
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let countdownText = '';
        if (days > 0) {
            countdownText += `${days}d `;
        }
        if (hours > 0 || days > 0) { // Show hours if days > 0 or hours > 0
             countdownText += `${hours}h `;
        }
         if (minutes > 0 || hours > 0 || days > 0) { // Show minutes if days/hours > 0 or minutes > 0
            countdownText += `${minutes}m `;
         }
        countdownText += `${seconds}s`;

        element.textContent = countdownText.trim();

        // Add class based on urgency
        if (diff < 24 * 60 * 60 * 1000) { // Less than 1 day
            element.classList.add('soon');
        } else {
             element.classList.add('far');
        }
    }

    function clearCountdownIntervals() {
        countdownIntervals.forEach(intervalId => clearInterval(intervalId));
        countdownIntervals = []; // Reset the array
    }

    // --- Subtask Modal Logic ---
    function openSubtaskModal(taskId) {
        parentTaskIdInput.value = taskId; // Set the hidden input
        subtaskTextInput.value = ''; // Clear text input
        subtaskModal.style.display = 'flex'; // Show modal
        subtaskTextInput.focus(); // Focus input field
    }

    function closeSubtaskModal() {
        subtaskModal.style.display = 'none';
        parentTaskIdInput.value = ''; // Clear hidden input
        subtaskTextInput.value = '';
    }


    // --- Utility ---
    // Basic HTML escaping to prevent XSS
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // --- Event Listeners ---
    addTaskBtn.addEventListener('click', addTask);

    // Handle enter key in task input
    taskTextInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // Event delegation for clicks within the task list
    taskList.addEventListener('click', (e) => {
        const target = e.target;
        const taskItem = target.closest('.task-item');
        const subtaskItem = target.closest('.subtask-item');


        if (target.classList.contains('task-complete-checkbox')) {
            // --- Handle Main Task Completion ---
            if (taskItem) {
                const taskId = taskItem.dataset.taskId;
                const isCompleted = target.checked;
                updateTask(taskId, null, { completed: isCompleted });
            }
        } else if (target.classList.contains('subtask-complete-checkbox')) {
            // --- Handle Subtask Completion ---
            if (subtaskItem) {
                const subtaskId = subtaskItem.dataset.subtaskId;
                const parentTaskId = subtaskItem.dataset.parentId;
                const isCompleted = target.checked;
                updateTask(parentTaskId, subtaskId, { completed: isCompleted });
             }
        } else if (target.classList.contains('delete-btn')) {
            // --- Handle Main Task Deletion ---
            if (taskItem) {
                const taskId = taskItem.dataset.taskId;
                deleteTask(taskId);
            }
        } else if (target.classList.contains('delete-subtask-btn')) {
            // --- Handle Subtask Deletion ---
             if (subtaskItem) {
                const subtaskId = subtaskItem.dataset.subtaskId;
                const parentTaskId = subtaskItem.dataset.parentId;
                deleteTask(parentTaskId, subtaskId);
             }
        } else if (target.classList.contains('add-subtask-btn')) {
             // --- Handle Open Subtask Modal ---
             if (taskItem) {
                 const taskId = taskItem.dataset.taskId;
                 openSubtaskModal(taskId);
             }
        }
    });

     // Subtask Modal Event Listeners
    addSubtaskBtn.addEventListener('click', addSubtask);
    closeModalBtn.addEventListener('click', closeSubtaskModal);

    // Close modal if clicked outside the content
    subtaskModal.addEventListener('click', (e) => {
        if (e.target === subtaskModal) {
            closeSubtaskModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && subtaskModal.style.display !== 'none') {
            closeSubtaskModal();
        }
    });


    // --- Initial Load ---
    fetchTasks();

}); // End DOMContentLoaded