/**
 * Offer Tasks JavaScript
 * Handles the next steps checklist functionality for accepted offers
 */

document.addEventListener('DOMContentLoaded', function() {
  // Only initialize if we're on an offer page with tasks
  if (document.getElementById('offer-tasks-container')) {
    initTasksModule();
  }
});

/**
 * Initialize the tasks module
 */
function initTasksModule() {
  // Get the offer ID from the data attribute
  const offerId = document.getElementById('offer-tasks-container').dataset.offerId;
  
  // Load tasks from the server
  loadTasks(offerId);
  
  // Set up event listeners
  setupEventListeners(offerId);
}

/**
 * Load tasks from the server
 * @param {String} offerId - The ID of the offer
 */
function loadTasks(offerId) {
  fetch(`/offer-tasks/${offerId}/tasks`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load tasks');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        renderTasks(data.tasks);
      } else {
        showError('Failed to load tasks: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error loading tasks:', error);
      showError('Error loading tasks. Please try again.');
    });
}

/**
 * Render tasks in the UI
 * @param {Array} tasks - Array of task objects
 */
function renderTasks(tasks) {
  const container = document.getElementById('tasks-list');
  container.innerHTML = '';
  
  // Group tasks by category
  const groupedTasks = groupTasksByCategory(tasks);
  
  // Render each category
  for (const category in groupedTasks) {
    const categoryTasks = groupedTasks[category];
    
    // Create category header
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'task-category-header';
    categoryHeader.innerHTML = `
      <h5 class="mb-2 mt-3">${formatCategoryName(category)}</h5>
    `;
    container.appendChild(categoryHeader);
    
    // Create task list for this category
    const taskList = document.createElement('div');
    taskList.className = 'task-list';
    
    // Add each task in this category
    categoryTasks.forEach(task => {
      const taskElement = createTaskElement(task);
      taskList.appendChild(taskElement);
    });
    
    container.appendChild(taskList);
  }
  
  // Update progress indicators
  updateProgressIndicators(tasks);
}

/**
 * Group tasks by category
 * @param {Array} tasks - Array of task objects
 * @returns {Object} - Object with categories as keys and arrays of tasks as values
 */
function groupTasksByCategory(tasks) {
  const grouped = {};
  
  tasks.forEach(task => {
    if (!grouped[task.category]) {
      grouped[task.category] = [];
    }
    grouped[task.category].push(task);
  });
  
  return grouped;
}

/**
 * Format category name for display
 * @param {String} category - Category name from the database
 * @returns {String} - Formatted category name
 */
function formatCategoryName(category) {
  switch (category) {
    case 'inspection':
      return 'Home Inspection';
    case 'financing':
      return 'Financing & Appraisal';
    case 'closing':
      return 'Closing Preparation';
    case 'other':
      return 'Other Tasks';
    default:
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

/**
 * Create a task element
 * @param {Object} task - Task object
 * @returns {HTMLElement} - Task element
 */
function createTaskElement(task) {
  const taskElement = document.createElement('div');
  taskElement.className = `task-item ${task.status === 'completed' ? 'completed' : ''}`;
  taskElement.dataset.taskId = task._id;
  
  // Format due date if present
  let dueDateText = '';
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    dueDateText = `<span class="task-due-date">Due: ${dueDate.toLocaleDateString()}</span>`;
  }
  
  // Create task content
  taskElement.innerHTML = `
    <div class="task-header d-flex align-items-center">
      <div class="form-check">
        <input class="form-check-input task-checkbox" type="checkbox" 
          id="task-${task._id}" ${task.status === 'completed' ? 'checked' : ''}>
        <label class="form-check-label" for="task-${task._id}">
          ${task.title}
        </label>
      </div>
      ${dueDateText}
    </div>
    <div class="task-description">
      ${task.description || ''}
    </div>
    <div class="task-actions mt-2 ${task.isRequired ? 'd-none' : ''}">
      <button class="btn btn-sm btn-outline-danger delete-task-btn">
        <i class="bi bi-trash"></i> Delete
      </button>
    </div>
  `;
  
  return taskElement;
}

/**
 * Update progress indicators
 * @param {Array} tasks - Array of task objects
 */
function updateProgressIndicators(tasks) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Update progress bar
  const progressBar = document.getElementById('tasks-progress-bar');
  progressBar.style.width = `${progressPercentage}%`;
  progressBar.setAttribute('aria-valuenow', progressPercentage);
  
  // Update progress text
  document.getElementById('tasks-progress-text').textContent = 
    `${completedTasks} of ${totalTasks} tasks completed (${progressPercentage}%)`;
}

/**
 * Set up event listeners
 * @param {String} offerId - The ID of the offer
 */
function setupEventListeners(offerId) {
  const container = document.getElementById('tasks-list');
  const addTaskForm = document.getElementById('add-task-form');
  
  // Task checkbox change
  container.addEventListener('change', function(e) {
    if (e.target.classList.contains('task-checkbox')) {
      const taskItem = e.target.closest('.task-item');
      const taskId = taskItem.dataset.taskId;
      const isCompleted = e.target.checked;
      
      updateTaskStatus(offerId, taskId, isCompleted ? 'completed' : 'pending');
    }
  });
  
  // Delete task button
  container.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-task-btn') || 
        e.target.parentElement.classList.contains('delete-task-btn')) {
      const taskItem = e.target.closest('.task-item');
      const taskId = taskItem.dataset.taskId;
      
      if (confirm('Are you sure you want to delete this task?')) {
        deleteTask(offerId, taskId);
      }
    }
  });
  
  // Add task form submission
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const title = document.getElementById('new-task-title').value.trim();
      const description = document.getElementById('new-task-description').value.trim();
      const category = document.getElementById('new-task-category').value;
      
      if (title) {
        addTask(offerId, {
          title,
          description,
          category
        });
        
        // Reset form
        addTaskForm.reset();
      }
    });
  }
}

/**
 * Update task status
 * @param {String} offerId - The ID of the offer
 * @param {String} taskId - The ID of the task
 * @param {String} status - The new status ('pending', 'in_progress', 'completed', 'skipped')
 */
function updateTaskStatus(offerId, taskId, status) {
  fetch(`/offer-tasks/${offerId}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Update UI
        const taskItem = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
        if (status === 'completed') {
          taskItem.classList.add('completed');
        } else {
          taskItem.classList.remove('completed');
        }
        
        // Reload tasks to update progress
        loadTasks(offerId);
      } else {
        showError('Failed to update task: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error updating task:', error);
      showError('Error updating task. Please try again.');
    });
}

/**
 * Add a new task
 * @param {String} offerId - The ID of the offer
 * @param {Object} taskData - The task data
 */
function addTask(offerId, taskData) {
  fetch(`/offer-tasks/${offerId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to add task');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Reload tasks
        loadTasks(offerId);
      } else {
        showError('Failed to add task: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error adding task:', error);
      showError('Error adding task. Please try again.');
    });
}

/**
 * Delete a task
 * @param {String} offerId - The ID of the offer
 * @param {String} taskId - The ID of the task
 */
function deleteTask(offerId, taskId) {
  fetch(`/offer-tasks/${offerId}/tasks/${taskId}`, {
    method: 'DELETE'
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Remove task from UI
        const taskItem = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
        taskItem.remove();
        
        // Reload tasks to update progress
        loadTasks(offerId);
      } else {
        showError('Failed to delete task: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('Error deleting task:', error);
      showError('Error deleting task. Please try again.');
    });
}

/**
 * Show error message
 * @param {String} message - Error message
 */
function showError(message) {
  const errorElement = document.getElementById('tasks-error');
  errorElement.textContent = message;
  errorElement.classList.remove('d-none');
  
  // Hide after 5 seconds
  setTimeout(() => {
    errorElement.classList.add('d-none');
  }, 5000);
}
