async function fetchUserProfile(){
    const response = await fetch('/api/profile');
    const data = await response.json();
    document.querySelector('.profile-details').innerHTML = 
        `<p><strong>Name: </strong>${data.name}</p>
        <p><strong>Email: </strong>${data.email}</p>
        <p><strong>Interests: </strong>${data.interests.join(', ')}</p>`;
}

async function fetchChatHistory(){
    const response = await fetch('/api/chat-history');
    const data = await response.json();
    const messageContainer = document.getElementById('messages');
    messageContainer.innerHTML = '';
    data.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', message.sender === 'You' ? 'sent' : 'received');
        messageElement.textContent = `${message.sender}: ${message.text}`;
        messageContainer.appendChild(messageElement);
    });
}

async function sendMessage(){
    const messageInput = document.getElementById('message');
    const message = messageInput.value;
    if (message.trim() !== ''){
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message})
        });
        if(response.ok){
            messageInput.value = '';
            fetchChatHistory();
        }
    };
}

async function handleAIAssistant() {
    const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    });
    if(response.ok) {
        fetchChatHistory();
    }
}

async function handleConversationAccelerator() {
    const response = await fetch('/api/accelerate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    });
    if(response.ok) {
        fetchChatHistory();
    }
}

document.getElementById('send-btn')?.addEventListener('click', sendMessage);
window.addEventListener('load', () => {
    if (document.querySelector('.profile-container')) fetchUserProfile();
    if (document.querySelector('.chat-container')) fetchChatHistory();
    
    document.getElementById('ai-assistant-btn')?.addEventListener('click', handleAIAssistant);
    document.getElementById('conversation-accelerator-btn')?.addEventListener('click', handleConversationAccelerator);
});