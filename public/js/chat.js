let currentChat = null;
    const socket = io();

    // ★★★ DEBUG: Check if data attribute exists ★★★
console.log('Body data-user-id attribute:', document.body.getAttribute('data-user-id'));
// ★★★ END DEBUG ★★★

    
    // ★★★ ADD THESE NEW SOCKET LISTENERS RIGHT HERE ★★★
// Listen for new messages from others
socket.on('new-message', (data) => {
    if (currentChat && data.ride_id === currentChat.rideId) {
        console.log('📩 Received message from others:', data);
        addMessageToChat(data);
    }
});

// Listen for message sent confirmation
socket.on('message-sent', (data) => {
    if (currentChat && data.ride_id === currentChat.rideId) {
        console.log('✅ Message delivered:', data);
        // You can update the message status in UI if needed
        const messageElement = document.querySelector(`[data-message-id="pending-${data.tempId}"]`);
        if (messageElement) {
            messageElement.querySelector('.message-time').textContent = 
                new Date(data.created_at).toLocaleTimeString();
        }
    }
});

// Listen for message errors
socket.on('message-error', (data) => {
    console.error('❌ Message failed:', data);
    alert('Failed to send message. Please try again.');
    
    // Remove the pending message
    const messageElement = document.querySelector(`[data-message-id="pending-${data.tempId}"]`);
    if (messageElement) {
        messageElement.remove();
    }
});
// ★★★ END NEW SOCKET LISTENERS ★★★



    function openRideChat(rideId, otherUserId, otherUserName) {
        currentChat = { rideId, otherUserId, otherUserName };
        
        // Update modal title
        document.getElementById('chat-title').textContent = 
            `Chat for Ride #${rideId} with ${otherUserName}`;
        
        // Clear previous messages
        document.getElementById('chat-messages').innerHTML = '';
        
        // Load chat history
        loadChatHistory(rideId);
        
        // Join ride room
        socket.emit('join-ride', rideId);
        
        // Setup event listeners
        setupChatListeners();
        
        // Show modal
        const chatModal = new bootstrap.Modal(document.getElementById('rideChatModal'));
        chatModal.show();
    }

    async function loadChatHistory(rideId) {
        try {
            const response = await fetch(`/api/chat/ride/${rideId}`);
            const data = await response.json();
            
            if (data.success) {
                data.messages.forEach(msg => {
                    addMessageToChat(msg);
                });
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }



    function addMessageToChat(message) {
    const messagesContainer = document.getElementById('chat-messages');
    
    // Check if message already exists (for pending messages)
    if (message.isPending) {
        const existingMessage = document.querySelector(`[data-message-id="${message.id}"]`);
        if (existingMessage) {
            // Update existing pending message
            existingMessage.querySelector('.message-text').textContent = message.message;
            return;
        }
    }
    
    const messageDiv = document.createElement('div');
    
    const currentUserId = parseInt(document.body.getAttribute('data-user-id'));
    const isCurrentUser = message.sender_id === currentUserId;
    
    messageDiv.className = `d-flex mb-2 ${isCurrentUser ? 'justify-content-end' : 'justify-content-start'}`;
    messageDiv.setAttribute('data-message-id', message.id || 'new');
    
    messageDiv.innerHTML = `
        <div class="message ${isCurrentUser ? 'bg-primary text-white' : 'bg-light'} rounded p-2" 
             style="max-width: 70%;">
            <div class="message-text">${escapeHtml(message.message)}</div>
            <div class="message-time small ${isCurrentUser ? 'text-white-50' : 'text-muted'}">
                ${new Date(message.created_at).toLocaleTimeString()}
                ${message.isPending ? ' (Sending...)' : ''}
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}




    function setupChatListeners() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    
    // Track pending messages to avoid duplicates
    let pendingMessages = new Set();
    
    const sendMessage = () => {
        if (!currentChat) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        // Get user ID
        const userIdStr = document.body.getAttribute('data-user-id');
        if (!userIdStr || userIdStr === 'null' || userIdStr === 'undefined') {
            alert('Error: Cannot get user information. Please refresh the page.');
            return;
        }
        
        const senderId = parseInt(userIdStr);
        const tempId = Date.now();
        
        
        // Add message to UI immediately (with temporary ID)
        addMessageToChat({
            id: 'pending-' + tempId, // Temporary ID
            message: message,
            sender_id: senderId,
            created_at: new Date(),
            isPending: true // Mark as pending
        });
        
        input.value = '';
        
        // Send via socket
        socket.emit('chat-message', {
            rideId: currentChat.rideId,
            senderId: senderId,
            receiverId: currentChat.otherUserId,
            message: message,
            tempId: tempId // Send temporary ID with message
        });
    };
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    sendBtn.addEventListener('click', sendMessage);
}


    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Close socket when modal is closed
    document.getElementById('rideChatModal').addEventListener('hidden.bs.modal', function () {
        currentChat = null;
    });