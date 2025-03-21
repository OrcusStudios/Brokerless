// public/js/notificationUpdater.js

document.addEventListener('DOMContentLoaded', function() {
    // Only run for authenticated users
    const currentUserId = document.getElementById('current-user-id')?.value;
    if (!currentUserId) return;
    
    // Elements
    const messagesBadge = document.getElementById('messages-badge');
    const notificationBadge = document.getElementById('notification-badge');
    
    // Update message and notification badges periodically
    setInterval(updateBadges, 60000); // Check every minute
    
    // Socket.io setup for real-time notifications
    const socket = io();
    
    // Register user with socket
    socket.emit('register', currentUserId);
    
    // Listen for real-time notifications
    socket.on('notification', handleNotification);
    
    // Listen for new messages
    socket.on('new_message', handleNewMessage);
    
    // Functions
    
    // Update badge counts via AJAX
    function updateBadges() {
        // Update unread message count
        fetch('/messages/unread/count')
            .then(response => response.json())
            .then(data => {
                updateMessageBadge(data.count);
            })
            .catch(error => console.error('Error fetching unread messages:', error));
        
        // Update unread notification count
        fetch('/notifications/unread/count')
            .then(response => response.json())
            .then(data => {
                updateNotificationBadge(data.count);
            })
            .catch(error => console.error('Error fetching notifications:', error));
    }
    
    // Update message badge count
    function updateMessageBadge(count) {
        if (!messagesBadge) return;
        
        if (count > 0) {
            messagesBadge.textContent = count;
            messagesBadge.style.display = 'inline-block';
        } else {
            messagesBadge.style.display = 'none';
        }
    }
    
    // Update notification badge count
    function updateNotificationBadge(count) {
        if (!notificationBadge) return;
        
        if (count > 0) {
            notificationBadge.textContent = count;
            notificationBadge.style.display = 'inline-block';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
    
    // Handle incoming notification
    function handleNotification(notification) {
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Notification', {
                body: notification.message,
                icon: '/images/notification-icon.png'
            });
        }
        
        // Update notification badge
        const currentCount = parseInt(notificationBadge?.textContent || '0');
        updateNotificationBadge(currentCount + 1);
        
        // Play notification sound if enabled
        playNotificationSound();
    }
    
    // Handle new message
    function handleNewMessage(message) {
        // Only update badge if we're not currently in the conversation
        const currentConversationId = document.querySelector('input[name="receiverId"]')?.value;
        
        if (!currentConversationId || message.sender._id !== currentConversationId) {
            // Update message badge
            const currentCount = parseInt(messagesBadge?.textContent || '0');
            updateMessageBadge(currentCount + 1);
            
            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`Message from ${message.sender.name}`, {
                    body: message.content,
                    icon: message.sender.profileImage || '/images/default-avatar.png'
                });
            }
            
            // Play notification sound
            playNotificationSound();
        }
    }
    
    // Play notification sound
    function playNotificationSound() {
        // Check if sound is enabled in user preferences
        const soundEnabled = localStorage.getItem('notification-sound-enabled') !== 'false';
        
        if (soundEnabled) {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5; // Set volume to 50%
            audio.play().catch(error => {
                // Browser may block autoplay
                console.log('Could not play notification sound:', error);
            });
        }
    }
    
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        // Add a button to request permission
        const permissionButton = document.createElement('button');
        permissionButton.className = 'btn btn-sm btn-primary position-fixed bottom-0 end-0 m-3';
        permissionButton.innerHTML = '<i class="bi bi-bell me-1"></i>Enable Notifications';
        permissionButton.addEventListener('click', () => {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    // Remove the button when granted
                    permissionButton.remove();
                }
            });
        });
        
        document.body.appendChild(permissionButton);
    }
});