// public/js/messaging.js

// Initialize messaging functionality when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Connect to Socket.io server
    const socket = io();
    
    // Get current user ID from page data
    const currentUserId = document.getElementById('current-user-id')?.value;
    
    // Elements
    const messagesContainer = document.getElementById('messages-container');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('content');
    const fileInput = document.getElementById('attachments');
    const fileList = document.getElementById('file-list');
    const typingIndicator = document.getElementById('typing-indicator');
    
    // Register user with socket for private messaging
    if (currentUserId) {
        socket.emit('register', currentUserId);
        
        // Listen for new messages
        socket.on('new_message', handleNewMessage);
        
        // Listen for message sent confirmation
        socket.on('message_sent', handleMessageSent);
        
        // Listen for message read receipts
        socket.on('message_read', handleMessageRead);
        
        // Listen for typing indicators
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stopped_typing', handleUserStoppedTyping);
        
        // Listen for system messages
        socket.on('system_message', handleSystemMessage);
        
        // Listen for notifications
        socket.on('notification', handleNotification);
    }
    
    // Scroll to bottom of messages container
    if (messagesContainer) {
        scrollToBottom();
    }
    
    // Setup message form submission
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendMessage();
        });
    }
    
    // Setup typing indicator
    if (messageInput) {
        let typingTimeout;
        
        messageInput.addEventListener('input', function() {
            // Get receiver ID from the form
            const receiverId = document.querySelector('input[name="receiverId"]').value;
            
            // Clear previous timeout
            clearTimeout(typingTimeout);
            
            // Send typing indicator
            socket.emit('typing', {
                senderId: currentUserId,
                receiverId: receiverId
            });
            
            // Set timeout to stop typing indicator after 3 seconds of inactivity
            typingTimeout = setTimeout(() => {
                socket.emit('stop_typing', {
                    senderId: currentUserId,
                    receiverId: receiverId
                });
            }, 3000);
        });
    }
    
    // File input handler
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    // Mark all messages in conversation as read
    if (messagesContainer) {
        const conversationUserId = document.querySelector('input[name="receiverId"]')?.value;
        
        if (conversationUserId) {
            fetch(`/messages/conversation/${conversationUserId}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).catch(err => console.error('Error marking conversation as read:', err));
        }
    }
    
    // Functions
    
    // Handle receiving a new message
    function handleNewMessage(message) {
        // Only process if we're in a conversation with this user
        const conversationUserId = document.querySelector('input[name="receiverId"]')?.value;
        
        if (conversationUserId && 
            (message.sender._id === conversationUserId || message.receiver === conversationUserId)) {
            
            // Add message to the UI
            appendMessage(message);
            
            // Scroll to the bottom
            scrollToBottom();
            
            // Mark message as read immediately
            socket.emit('mark_read', {
                messageId: message._id,
                userId: currentUserId
            });
            
            // Also send API request to mark as read in database
            fetch(`/messages/${message._id}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).catch(err => console.error('Error marking message as read:', err));
        } else {
            // If not in conversation with this user, show notification
            showMessageNotification(message);
        }
    }
    
    // Handle message sent confirmation
    function handleMessageSent(message) {
        // Update the UI if needed
        const pendingMessage = document.querySelector(`.message-pending[data-temp-id="${message.tempId}"]`);
        
        if (pendingMessage) {
            // Replace pending message with confirmed message
            pendingMessage.classList.remove('message-pending');
            pendingMessage.setAttribute('data-message-id', message._id);
            
            // Update timestamp
            const timestamp = pendingMessage.querySelector('.message-timestamp');
            if (timestamp) {
                timestamp.textContent = formatTime(message.createdAt);
            }
        }
    }
    
    // Handle message read receipt
    function handleMessageRead(data) {
        // Find message in UI and update read status
        const message = document.querySelector(`.message[data-message-id="${data.messageId}"]`);
        
        if (message) {
            const timestamp = message.querySelector('.message-timestamp');
            
            if (timestamp && !timestamp.querySelector('.read-indicator')) {
                const readIndicator = document.createElement('span');
                readIndicator.className = 'read-indicator';
                readIndicator.innerHTML = '<i class="bi bi-check2-all"></i>';
                timestamp.appendChild(readIndicator);
            }
        }
    }
    
    // Handle user typing indicator
    function handleUserTyping(data) {
        // Only show typing indicator if we're in conversation with this user
        const conversationUserId = document.querySelector('input[name="receiverId"]')?.value;
        
        if (conversationUserId && data.userId === conversationUserId && typingIndicator) {
            typingIndicator.style.display = 'block';
        }
    }
    
    // Handle user stopped typing
    function handleUserStoppedTyping(data) {
        // Hide typing indicator
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
    }
    
    // Handle system message
    function handleSystemMessage(message) {
        // Add system message to the UI if we're in a conversation
        if (messagesContainer) {
            const systemMessageElement = document.createElement('div');
            systemMessageElement.className = 'system-message';
            systemMessageElement.textContent = message.content;
            
            messagesContainer.appendChild(systemMessageElement);
            scrollToBottom();
        }
    }
    
    // Handle notification
    function handleNotification(notification) {
        // Show notification to user
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Message', {
                body: notification.message,
                icon: '/images/notification-icon.png'
            });
        }
        
        // Also update notification badge in UI
        updateUnreadCount();
    }
    
    // Send a message
    function sendMessage() {
        if (!messageInput.value.trim()) return;
        
        const receiverId = document.querySelector('input[name="receiverId"]').value;
        const listingId = document.querySelector('select[name="listingId"]')?.value || 
                         document.querySelector('input[name="listingId"]')?.value;
        const offerId = document.querySelector('select[name="offerId"]')?.value || 
                       document.querySelector('input[name="offerId"]')?.value;
        
        // Generate temporary ID to track this message
        const tempId = `temp-${Date.now()}`;
        
        // Prepare message data
        const messageData = {
            senderId: currentUserId,
            receiverId: receiverId,
            content: messageInput.value.trim(),
            tempId: tempId,
            createdAt: new Date()
        };
        
        // Add optional fields if they exist
        if (listingId) messageData.listingId = listingId;
        if (offerId) messageData.offerId = offerId;
        
        // Handle file attachments
        const files = fileInput.files;
        if (files.length > 0) {
            // We need to use FormData for file uploads
            const formData = new FormData(messageForm);
            
            // Send with regular AJAX instead of socket for file uploads
            fetch('/messages/send', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Clear form
                messageInput.value = '';
                fileInput.value = '';
                if (fileList) fileList.innerHTML = '';
                
                // Add message to UI immediately
                appendOptimisticMessage(messageData);
                
                // Scroll to bottom
                scrollToBottom();
            })
            .catch(error => {
                console.error('Error sending message:', error);
                alert('Failed to send message. Please try again.');
            });
        } else {
            // No files, send via socket for faster delivery
            socket.emit('send_message', messageData);
            
            // Clear input
            messageInput.value = '';
            
            // Add message to UI immediately (optimistic UI update)
            appendOptimisticMessage(messageData);
            
            // Scroll to bottom
            scrollToBottom();
        }
    }
    
    // Handle file selection
    function handleFileSelection() {
        if (!fileList) return;
        
        fileList.innerHTML = '';
        
        const files = fileInput.files;
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const filePreview = document.createElement('div');
                filePreview.className = 'file-preview';
                
                // Different icon based on file type
                let iconClass = 'bi-file-earmark';
                if (file.type.startsWith('image/')) {
                    iconClass = 'bi-file-earmark-image';
                } else if (file.type === 'application/pdf') {
                    iconClass = 'bi-file-earmark-pdf';
                } else if (file.type.includes('word')) {
                    iconClass = 'bi-file-earmark-word';
                } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
                    iconClass = 'bi-file-earmark-excel';
                }
                
                filePreview.innerHTML = `
                    <div class="file-preview-icon">
                        <i class="bi ${iconClass}"></i>
                    </div>
                    <div class="file-preview-name">${file.name}</div>
                    <div class="file-preview-remove" onclick="removeFile(${i})">
                        <i class="bi bi-x"></i>
                    </div>
                `;
                
                fileList.appendChild(filePreview);
            }
        }
    }
    
    // Remove a file from the input
    window.removeFile = function(index) {
        // We can't directly remove a file from a FileList, so we need to create a new FileList
        const dt = new DataTransfer();
        const files = fileInput.files;
        
        for (let i = 0; i < files.length; i++) {
            if (i !== index) {
                dt.items.add(files[i]);
            }
        }
        
        fileInput.files = dt.files;
        handleFileSelection();
    };
    
    // Append a new message to the UI
    function appendMessage(message) {
        if (!messagesContainer) return;
        
        const isSender = message.sender._id === currentUserId;
        
        // Check if we need to add a date divider
        const messageDate = new Date(message.createdAt).toDateString();
        const lastMessage = messagesContainer.lastElementChild;
        const showDateDivider = !lastMessage || 
                               (lastMessage.dataset.date !== messageDate);
        
        // Add date divider if needed
        if (showDateDivider) {
            const dateDivider = document.createElement('div');
            dateDivider.className = 'message-date-divider';
            dateDivider.innerHTML = `<span>${formatDate(message.createdAt)}</span>`;
            messagesContainer.appendChild(dateDivider);
        }
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isSender ? 'message-sent' : 'message-received'}`;
        messageElement.dataset.messageId = message._id;
        messageElement.dataset.date = messageDate;
        
        // Message avatar (only for received messages)
        if (!isSender) {
            const avatarElement = document.createElement('div');
            avatarElement.className = 'message-avatar';
            
            if (message.sender.profileImage) {
                avatarElement.innerHTML = `<img src="${message.sender.profileImage}" alt="${message.sender.name}">`;
            } else {
                avatarElement.innerHTML = `<div class="avatar-placeholder">${message.sender.name.charAt(0).toUpperCase()}</div>`;
            }
            
            messageElement.appendChild(avatarElement);
        }
        
        // Message content
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        
        // Message text
        contentElement.innerHTML = `<p>${formatMessageText(message.content)}</p>`;
        
        // Attachments
        if (message.attachments && message.attachments.length > 0) {
            const attachmentsContainer = document.createElement('div');
            attachmentsContainer.className = 'message-attachments';
            
            message.attachments.forEach(attachment => {
                const attachmentElement = document.createElement('div');
                attachmentElement.className = 'attachment';
                
                if (attachment.type.startsWith('image/')) {
                    attachmentElement.innerHTML = `
                        <a href="${attachment.url}" target="_blank" class="attachment-link">
                            <img src="${attachment.url}" alt="${attachment.name}" class="attachment-preview">
                            <div class="attachment-name">${attachment.name}</div>
                        </a>
                    `;
                } else {
                    // Icon based on file type
                    let iconClass = 'bi-file-earmark';
                    if (attachment.type === 'application/pdf') {
                        iconClass = 'bi-file-earmark-pdf';
                    } else if (attachment.type.includes('word')) {
                        iconClass = 'bi-file-earmark-word';
                    } else if (attachment.type.includes('excel')) {
                        iconClass = 'bi-file-earmark-excel';
                    }
                    
                    attachmentElement.innerHTML = `
                        <a href="${attachment.url}" target="_blank" class="attachment-link">
                            <div class="attachment-icon">
                                <i class="bi ${iconClass}"></i>
                            </div>
                            <div class="attachment-name">${attachment.name}</div>
                        </a>
                    `;
                }
                
                attachmentsContainer.appendChild(attachmentElement);
            });
            
            contentElement.appendChild(attachmentsContainer);
        }
        
        // Context (if message is related to a listing or offer)
        if (message.listingId) {
            const contextElement = document.createElement('div');
            contextElement.className = 'message-context listing-context';
            contextElement.innerHTML = `
                <a href="/listings/${message.listingId._id}" class="context-link">
                    <small>RE: Property at ${message.listingId.address}</small>
                </a>
            `;
            contentElement.appendChild(contextElement);
        }
        
        if (message.offerId) {
            const contextElement = document.createElement('div');
            contextElement.className = 'message-context offer-context';
            contextElement.innerHTML = `
                <a href="/offers/${message.offerId._id}" class="context-link">
                    <small>RE: Offer of $${message.offerId.offerPrice.toLocaleString()}</small>
                </a>
            `;
            contentElement.appendChild(contextElement);
        }
        
        // Message timestamp
        const timestampElement = document.createElement('div');
        timestampElement.className = 'message-timestamp';
        
        let timestampContent = formatTime(message.createdAt);
        
        // Add read indicator for sent messages
        if (isSender && message.isRead) {
            timestampContent += '<i class="bi bi-check2-all ms-1"></i>';
        }
        
        timestampElement.innerHTML = timestampContent;
        contentElement.appendChild(timestampElement);
        
        messageElement.appendChild(contentElement);
        messagesContainer.appendChild(messageElement);
    }
    
    // Append an optimistic message (before server confirmation)
    function appendOptimisticMessage(message) {
        if (!messagesContainer) return;
        
        // Check if we need to add a date divider
        const messageDate = new Date(message.createdAt).toDateString();
        const lastMessage = messagesContainer.lastElementChild;
        const showDateDivider = !lastMessage || 
                               (lastMessage.dataset.date !== messageDate);
        
        // Add date divider if needed
        if (showDateDivider) {
            const dateDivider = document.createElement('div');
            dateDivider.className = 'message-date-divider';
            dateDivider.innerHTML = `<span>${formatDate(message.createdAt)}</span>`;
            messagesContainer.appendChild(dateDivider);
        }
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'message message-sent message-pending';
        messageElement.dataset.tempId = message.tempId;
        messageElement.dataset.date = messageDate;
        
        // Message content
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        
        // Message text
        contentElement.innerHTML = `<p>${formatMessageText(message.content)}</p>`;
        
        // Context (if message is related to a listing or offer)
        if (message.listingId) {
            const contextElement = document.createElement('div');
            contextElement.className = 'message-context listing-context';
            contextElement.innerHTML = `
                <a href="/listings/${message.listingId}" class="context-link">
                    <small>RE: Property</small>
                </a>
            `;
            contentElement.appendChild(contextElement);
        }
        
        if (message.offerId) {
            const contextElement = document.createElement('div');
            contextElement.className = 'message-context offer-context';
            contextElement.innerHTML = `
                <a href="/offers/${message.offerId}" class="context-link">
                    <small>RE: Offer</small>
                </a>
            `;
            contentElement.appendChild(contextElement);
        }
        
        // Message timestamp with sending indicator
        const timestampElement = document.createElement('div');
        timestampElement.className = 'message-timestamp';
        timestampElement.innerHTML = `Sending... <i class="bi bi-clock"></i>`;
        contentElement.appendChild(timestampElement);
        
        messageElement.appendChild(contentElement);
        messagesContainer.appendChild(messageElement);
    }
    
    // Show a notification for a new message
    function showMessageNotification(message) {
        // Update unread count badge
        updateUnreadCount();
        
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            const notificationTitle = `New message from ${message.sender.name}`;
            const notificationOptions = {
                body: message.content,
                icon: message.sender.profileImage || '/images/default-avatar.png'
            };
            
            const notification = new Notification(notificationTitle, notificationOptions);
            
            // Click on notification to open conversation
            notification.onclick = function() {
                window.focus();
                window.location.href = `/messages/conversation/${message.sender._id}`;
            };
        }
    }
    
    // Update the unread message count badge
    function updateUnreadCount() {
        fetch('/messages/unread/count')
            .then(response => response.json())
            .then(data => {
                const unreadBadge = document.getElementById('messages-badge');
                if (unreadBadge) {
                    if (data.count > 0) {
                        unreadBadge.textContent = data.count;
                        unreadBadge.style.display = 'inline-block';
                    } else {
                        unreadBadge.style.display = 'none';
                    }
                }
            })
            .catch(err => console.error('Error updating unread count:', err));
    }
    
    // Scroll messages container to bottom
    function scrollToBottom() {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    // Format the message text (handle links, etc.)
    function formatMessageText(text) {
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
    }
    
    // Format date for message groups
    function formatDate(date) {
        const messageDate = new Date(date);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        
        if (messageDate.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (messageDate.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return messageDate.toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }
    
    // Format time for message timestamps
    function formatTime(date) {
        return new Date(date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        // Delay the request to avoid bombarding the user immediately
        setTimeout(() => {
            Notification.requestPermission();
        }, 5000);
    }
});