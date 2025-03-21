// public/js/simple-rider-validation.js
document.addEventListener('DOMContentLoaded', function() {
    // Handle rider checkboxes
    const riderCheckboxes = document.querySelectorAll('.rider-checkbox');
    
    riderCheckboxes.forEach(checkbox => {
        // Set initial state
        const targetId = checkbox.dataset.target;
        const targetDiv = document.getElementById(targetId);
        
        if (targetDiv) {
            updateRequiredState(targetDiv, checkbox.checked);
            
            // Add change handler
            checkbox.addEventListener('change', function() {
                targetDiv.style.display = this.checked ? 'block' : 'none';
                updateRequiredState(targetDiv, this.checked);
            });
        }
    });
    
    // Handle contingency checkboxes
    const contingencyCheckboxes = document.querySelectorAll('.contingency-checkbox');
    
    contingencyCheckboxes.forEach(checkbox => {
        // Set initial state
        const detailsId = checkbox.id.replace('Contingency', 'Details');
        const detailsDiv = document.getElementById(detailsId);
        
        if (detailsDiv) {
            updateRequiredState(detailsDiv, checkbox.checked);
            
            // Add change handler
            checkbox.addEventListener('change', function() {
                detailsDiv.style.display = this.checked ? 'block' : 'none';
                updateRequiredState(detailsDiv, this.checked);
            });
        }
    });
    
    // Helper function to update required state of fields
    function updateRequiredState(container, isRequired) {
        const inputs = container.querySelectorAll('input[required], select[required], textarea[required]');
        inputs.forEach(input => {
            if (isRequired) {
                input.setAttribute('required', '');
            } else {
                input.removeAttribute('required');
            }
        });
    }
    
    // Set up preview contract button
    const previewBtn = document.getElementById('previewContractBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the form
            const form = document.getElementById('offerForm');
            
            if (form.checkValidity()) {
                // Create a special form data object for preview
                const formData = new FormData(form);
                const queryString = new URLSearchParams(formData).toString();
                
                // Open preview in new window
                window.open(`/offers/preview?${queryString}`, '_blank');
            } else {
                // Show validation errors
                form.reportValidity();
            }
        });
    }
});