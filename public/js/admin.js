/**
 * Admin Panel JavaScript
 * Handles client-side functionality for the admin panel
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize tooltips
  const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  if (tooltips.length > 0) {
    Array.from(tooltips).forEach(tooltip => {
      new bootstrap.Tooltip(tooltip);
    });
  }
  
  // Initialize popovers
  const popovers = document.querySelectorAll('[data-bs-toggle="popover"]');
  if (popovers.length > 0) {
    Array.from(popovers).forEach(popover => {
      new bootstrap.Popover(popover);
    });
  }
  
  // Handle permission checkboxes
  const permissionGroups = document.querySelectorAll('.permission-group-all');
  if (permissionGroups.length > 0) {
    permissionGroups.forEach(group => {
      group.addEventListener('change', function() {
        const isChecked = this.checked;
        const groupId = this.dataset.group;
        const groupCheckboxes = document.querySelectorAll(`.permission-item[data-group="${groupId}"]`);
        
        groupCheckboxes.forEach(checkbox => {
          checkbox.checked = isChecked;
        });
      });
    });
  }
  
  // Handle admin role selection
  const adminRoleSelect = document.getElementById('adminRole');
  if (adminRoleSelect) {
    adminRoleSelect.addEventListener('change', function() {
      const selectedRole = this.value;
      
      // If Super Admin, check all permissions
      if (selectedRole === 'SUPER_ADMIN') {
        const allPermissions = document.querySelectorAll('input[name="permissions[]"]');
        allPermissions.forEach(permission => {
          permission.checked = true;
          permission.disabled = true;
        });
        
        // Also disable group checkboxes
        const groupCheckboxes = document.querySelectorAll('.permission-group-all');
        groupCheckboxes.forEach(checkbox => {
          checkbox.checked = true;
          checkbox.disabled = true;
        });
        
        // Show a message
        const permissionsContainer = document.querySelector('.permissions-container');
        if (permissionsContainer) {
          const message = document.createElement('div');
          message.className = 'alert alert-info mt-3';
          message.id = 'superAdminMessage';
          message.innerHTML = '<i class="bi bi-info-circle me-2"></i>Super Admins have all permissions by default.';
          
          // Only add if it doesn't exist
          if (!document.getElementById('superAdminMessage')) {
            permissionsContainer.appendChild(message);
          }
        }
      } else {
        // Enable all permissions for other roles
        const allPermissions = document.querySelectorAll('input[name="permissions[]"]');
        allPermissions.forEach(permission => {
          permission.disabled = false;
        });
        
        // Also enable group checkboxes
        const groupCheckboxes = document.querySelectorAll('.permission-group-all');
        groupCheckboxes.forEach(checkbox => {
          checkbox.disabled = false;
        });
        
        // Remove the message if it exists
        const message = document.getElementById('superAdminMessage');
        if (message) {
          message.remove();
        }
        
        // Set default permissions based on role
        if (selectedRole === 'USER_ADMIN') {
          setDefaultPermissions(['MANAGE_USERS']);
        } else if (selectedRole === 'CONTENT_ADMIN') {
          setDefaultPermissions(['MANAGE_CONTENT']);
        } else if (selectedRole === 'TRANSACTION_ADMIN') {
          setDefaultPermissions(['MANAGE_TRANSACTIONS', 'MANAGE_LISTINGS']);
        }
      }
    });
  }
  
  // Function to set default permissions
  function setDefaultPermissions(permissions) {
    // First uncheck all
    const allPermissions = document.querySelectorAll('input[name="permissions[]"]');
    allPermissions.forEach(permission => {
      permission.checked = false;
    });
    
    // Then check the specified ones
    permissions.forEach(permission => {
      const checkbox = document.querySelector(`input[name="permissions[]"][value="${permission}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
    
    // Update group checkboxes
    updateGroupCheckboxes();
  }
  
  // Function to update group checkboxes based on individual permissions
  function updateGroupCheckboxes() {
    const permissionGroups = document.querySelectorAll('.permission-group-all');
    
    permissionGroups.forEach(group => {
      const groupId = group.dataset.group;
      const groupCheckboxes = document.querySelectorAll(`.permission-item[data-group="${groupId}"]`);
      
      // Check if all checkboxes in the group are checked
      const allChecked = Array.from(groupCheckboxes).every(checkbox => checkbox.checked);
      
      // Update the group checkbox
      group.checked = allChecked;
    });
  }
  
  // Handle user creation toggle
  const createNewToggle = document.getElementById('createNew');
  if (createNewToggle) {
    createNewToggle.addEventListener('change', function() {
      const existingUserSection = document.getElementById('existingUserSection');
      const newUserSection = document.getElementById('newUserSection');
      
      if (this.checked) {
        existingUserSection.style.display = 'none';
        newUserSection.style.display = 'block';
      } else {
        existingUserSection.style.display = 'block';
        newUserSection.style.display = 'none';
      }
    });
  }
  
  // Handle search form
  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      // Remove empty fields from the form before submitting
      const inputs = this.querySelectorAll('input, select');
      
      inputs.forEach(input => {
        if (input.value === '' || input.value === null) {
          input.disabled = true;
        }
      });
    });
  }
  
  // Handle filter tags
  const filterTags = document.querySelectorAll('.filter-tag .close');
  if (filterTags.length > 0) {
    filterTags.forEach(tag => {
      tag.addEventListener('click', function() {
        const param = this.dataset.param;
        
        // Get current URL and remove the parameter
        const url = new URL(window.location.href);
        url.searchParams.delete(param);
        
        // Redirect to the new URL
        window.location.href = url.toString();
      });
    });
  }
  
  // Handle confirmation dialogs
  const confirmButtons = document.querySelectorAll('[data-confirm]');
  if (confirmButtons.length > 0) {
    confirmButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        const message = this.dataset.confirm || 'Are you sure you want to perform this action?';
        
        if (!confirm(message)) {
          e.preventDefault();
        }
      });
    });
  }
  
  // Initialize any charts if Chart.js is available
  if (typeof Chart !== 'undefined') {
    initializeCharts();
  }
  
  // Function to initialize charts
  function initializeCharts() {
    // User registration chart
    const userChartCanvas = document.getElementById('userRegistrationChart');
    if (userChartCanvas) {
      const ctx = userChartCanvas.getContext('2d');
      
      // Get data from the data attributes
      const labels = JSON.parse(userChartCanvas.dataset.labels || '[]');
      const data = JSON.parse(userChartCanvas.dataset.values || '[]');
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'New Users',
            data: data,
            backgroundColor: 'rgba(13, 110, 253, 0.2)',
            borderColor: 'rgba(13, 110, 253, 1)',
            borderWidth: 2,
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    }
    
    // Listing chart
    const listingChartCanvas = document.getElementById('listingChart');
    if (listingChartCanvas) {
      const ctx = listingChartCanvas.getContext('2d');
      
      // Get data from the data attributes
      const labels = JSON.parse(listingChartCanvas.dataset.labels || '[]');
      const data = JSON.parse(listingChartCanvas.dataset.values || '[]');
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'New Listings',
            data: data,
            backgroundColor: 'rgba(25, 135, 84, 0.2)',
            borderColor: 'rgba(25, 135, 84, 1)',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    }
    
    // Transaction chart
    const transactionChartCanvas = document.getElementById('transactionChart');
    if (transactionChartCanvas) {
      const ctx = transactionChartCanvas.getContext('2d');
      
      // Get data from the data attributes
      const labels = JSON.parse(transactionChartCanvas.dataset.labels || '[]');
      const data = JSON.parse(transactionChartCanvas.dataset.values || '[]');
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Transactions',
            data: data,
            backgroundColor: 'rgba(253, 126, 20, 0.2)',
            borderColor: 'rgba(253, 126, 20, 1)',
            borderWidth: 2,
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    }
  }
});
