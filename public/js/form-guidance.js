// Form Guidance JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize term definitions
    initializeTermDefinitions();
    
    // Initialize progress indicators
    updateProgressIndicators();
});

/**
 * Initialize tooltips for form fields
 */
function initializeTooltips() {
    // Find all tooltip containers
    const tooltipContainers = document.querySelectorAll('.tooltip-container');
    
    // Add event listeners for mobile devices
    tooltipContainers.forEach(container => {
        // For mobile - toggle on tap
        container.addEventListener('click', function(e) {
            // Only handle click for mobile devices
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const tooltipText = this.querySelector('.tooltip-text');
                
                // Hide all other tooltips first
                document.querySelectorAll('.tooltip-text').forEach(tooltip => {
                    if (tooltip !== tooltipText) {
                        tooltip.style.visibility = 'hidden';
                        tooltip.style.opacity = '0';
                    }
                });
                
                // Toggle current tooltip
                if (tooltipText.style.visibility === 'visible') {
                    tooltipText.style.visibility = 'hidden';
                    tooltipText.style.opacity = '0';
                } else {
                    tooltipText.style.visibility = 'visible';
                    tooltipText.style.opacity = '1';
                }
            }
        });
    });
    
    // Close tooltips when clicking outside
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!e.target.closest('.tooltip-container')) {
                document.querySelectorAll('.tooltip-text').forEach(tooltip => {
                    tooltip.style.visibility = 'hidden';
                    tooltip.style.opacity = '0';
                });
            }
        }
    });
}

/**
 * Initialize term definitions
 */
function initializeTermDefinitions() {
    const termDefinitions = document.querySelectorAll('.term-definition');
    
    termDefinitions.forEach(term => {
        // Create tooltip container
        const container = document.createElement('span');
        container.className = 'tooltip-container';
        
        // Move term content to container
        container.innerHTML = term.innerHTML;
        
        // Create tooltip text
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip-text';
        tooltip.textContent = term.getAttribute('data-definition');
        
        // Add tooltip to container
        container.appendChild(tooltip);
        
        // Replace original term with tooltip container
        term.parentNode.replaceChild(container, term);
    });
}

/**
 * Update progress indicators for multi-step forms
 */
function updateProgressIndicators() {
    const progressBars = document.querySelectorAll('.form-progress-bar');
    
    progressBars.forEach(progressBar => {
        const steps = progressBar.querySelectorAll('.form-progress-step');
        const currentStep = parseInt(progressBar.getAttribute('data-current-step')) || 1;
        const totalSteps = steps.length;
        
        // Update progress bar
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            
            // Mark steps as active or completed
            if (stepNumber < currentStep) {
                step.classList.add('completed');
                step.innerHTML = '<i class="bi bi-check"></i>';
            } else if (stepNumber === currentStep) {
                step.classList.add('active');
            }
        });
        
        // Update progress labels
        const labels = document.querySelectorAll('.form-progress-label');
        labels.forEach((label, index) => {
            const stepNumber = index + 1;
            
            if (stepNumber < currentStep) {
                label.classList.add('completed');
            } else if (stepNumber === currentStep) {
                label.classList.add('active');
            }
        });
        
        // Update progress bar line
        const progressLine = document.createElement('div');
        progressLine.className = 'form-progress-line';
        progressLine.style.position = 'absolute';
        progressLine.style.top = '50%';
        progressLine.style.left = '0';
        progressLine.style.height = '2px';
        progressLine.style.backgroundColor = '#198754';
        progressLine.style.transform = 'translateY(-50%)';
        progressLine.style.zIndex = '1';
        
        // Calculate progress width
        const progress = (currentStep - 1) / (totalSteps - 1);
        progressLine.style.width = `${progress * 100}%`;
        
        // Add progress line to progress bar
        progressBar.appendChild(progressLine);
    });
}

/**
 * Add a tooltip to an element
 * @param {string} elementId - The ID of the element to add a tooltip to
 * @param {string} tooltipText - The text to display in the tooltip
 */
function addTooltip(elementId, tooltipText) {
    const element = document.getElementById(elementId);
    
    if (element) {
        // Create tooltip container
        const container = document.createElement('span');
        container.className = 'tooltip-container';
        
        // Create tooltip icon
        const icon = document.createElement('i');
        icon.className = 'bi bi-question-circle tooltip-icon';
        
        // Create tooltip text
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip-text';
        tooltip.textContent = tooltipText;
        
        // Add tooltip to container
        container.appendChild(icon);
        container.appendChild(tooltip);
        
        // Add tooltip container after element
        element.parentNode.insertBefore(container, element.nextSibling);
    }
}

/**
 * Add a section help box
 * @param {string} containerId - The ID of the container to add the help box to
 * @param {string} title - The title of the help box
 * @param {string} content - The content of the help box
 */
function addSectionHelp(containerId, title, content) {
    const container = document.getElementById(containerId);
    
    if (container) {
        // Create section help box
        const helpBox = document.createElement('div');
        helpBox.className = 'section-help';
        
        // Create title
        const titleElement = document.createElement('div');
        titleElement.className = 'section-help-title';
        titleElement.innerHTML = `<i class="bi bi-info-circle"></i>${title}`;
        
        // Create content
        const contentElement = document.createElement('p');
        contentElement.className = 'section-help-content';
        contentElement.textContent = content;
        
        // Add title and content to help box
        helpBox.appendChild(titleElement);
        helpBox.appendChild(contentElement);
        
        // Add help box to container
        container.insertBefore(helpBox, container.firstChild);
    }
}

/**
 * Add a breadcrumb navigation
 * @param {string} containerId - The ID of the container to add the breadcrumb to
 * @param {Array} steps - Array of step objects with name and url properties
 * @param {number} currentStep - The current step (1-based index)
 */
function addBreadcrumb(containerId, steps, currentStep) {
    const container = document.getElementById(containerId);
    
    if (container) {
        // Create breadcrumb
        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'form-breadcrumb';
        
        // Add steps
        steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'form-breadcrumb-item';
            
            if (index + 1 === currentStep) {
                stepElement.classList.add('active');
                stepElement.textContent = step.name;
            } else {
                const link = document.createElement('a');
                link.href = step.url;
                link.textContent = step.name;
                stepElement.appendChild(link);
            }
            
            breadcrumb.appendChild(stepElement);
        });
        
        // Add breadcrumb to container
        container.insertBefore(breadcrumb, container.firstChild);
    }
}

// Export functions for use in other scripts
window.FormGuidance = {
    addTooltip,
    addSectionHelp,
    addBreadcrumb,
    updateProgressIndicators
};
