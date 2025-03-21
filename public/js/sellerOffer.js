// public/js/sellerOffer.js

document.addEventListener('DOMContentLoaded', function() {
  // Initialize accept/reject offer buttons
  initializeOfferActionButtons();
  
  // Initialize contract preview
  initializeContractPreview();
});

/**
* Initialize accept/reject offer buttons
*/
function initializeOfferActionButtons() {
  // Accept Offer Button Handler
  const acceptButtons = document.querySelectorAll('.accept-offer-button');
  
  acceptButtons.forEach(button => {
      button.addEventListener('click', function(e) {
          e.preventDefault();
          
          const offerId = this.getAttribute('data-offer-id');
          if (!offerId) return;
          
          // Update the form action in the modal
          const form = document.getElementById('acceptOfferForm');
          if (form) {
              form.action = `/offers/${offerId}/accept`;
          }
          
          // Show the modal
          const modal = new bootstrap.Modal(document.getElementById('acceptOfferModal'));
          modal.show();
      });
  });
  
  // Reject Offer Button Handler
  const rejectButtons = document.querySelectorAll('.reject-offer-button');
  
  rejectButtons.forEach(button => {
      button.addEventListener('click', function(e) {
          e.preventDefault();
          
          const offerId = this.getAttribute('data-offer-id');
          if (!offerId) return;
          
          // Update the form action in the modal
          const form = document.getElementById('rejectOfferForm');
          if (form) {
              form.action = `/offers/${offerId}/reject`;
          }
          
          // Show the modal
          const modal = new bootstrap.Modal(document.getElementById('rejectOfferModal'));
          modal.show();
      });
  });
}

/**
* Initialize contract preview
*/
function initializeContractPreview() {
  const viewContractButtons = document.querySelectorAll('.view-contract-button');
  
  viewContractButtons.forEach(button => {
      button.addEventListener('click', function(e) {
          e.preventDefault();
          
          const offerId = this.getAttribute('data-offer-id');
          if (!offerId) return;
          
          // Update the download button href
          const downloadPdfBtn = document.getElementById('downloadPdfBtn');
          if (downloadPdfBtn) {
              downloadPdfBtn.href = `/offers/${offerId}/pdf`;
          }
          
          // Show the modal with loading state
          const modal = new bootstrap.Modal(document.getElementById('contractPreviewModal'));
          modal.show();
          
          // Fetch the contract content
          fetch(`/offers/${offerId}/contract`)
              .then(response => {
                  if (!response.ok) {
                      throw new Error('Network response was not ok');
                  }
                  return response.json();
              })
              .then(data => {
                  // Update the modal content
                  const contractPreviewContent = document.getElementById('contractPreviewContent');
                  if (contractPreviewContent && data.contractHtml) {
                      contractPreviewContent.innerHTML = data.contractHtml;
                  } else {
                      throw new Error('Invalid response data');
                  }
              })
              .catch(error => {
                  console.error('Error loading contract preview:', error);
                  
                  // Show error message in the modal
                  const contractPreviewContent = document.getElementById('contractPreviewContent');
                  if (contractPreviewContent) {
                      contractPreviewContent.innerHTML = `
                          <div class="alert alert-danger">
                              <i class="bi bi-exclamation-triangle-fill me-2"></i>
                              <strong>Error:</strong> Failed to load contract preview. Please try downloading the PDF instead.
                          </div>
                      `;
                  }
              });
      });
  });
}

/**
* Helper function to get CSRF token
*/
function getCSRFToken() {
  const tokenMeta = document.querySelector('meta[name="csrf-token"]');
  return tokenMeta ? tokenMeta.getAttribute('content') : '';
}