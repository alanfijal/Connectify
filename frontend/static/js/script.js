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

async function loadNextUser(){
    fetch('/api/swipe/next')
    .then(response => response.json())
    .then(data => {
        const userCard = document.getElementById('user-card');
        userCard.innerHTML = `
        <img src="${data.image_url}" alt="${data.name}" class="user-image">
        <div class="user-details">
            <h2>${data.name}</h2>
            <p>${data.bio}</p>
            <p><strong>Interests:</strong> ${data.interests}</p>
        </div>
        `;
    });
}

document.getElementById('send-btn')?.addEventListener('click', sendMessage);
document.getElementById('like-btn')?.addEventListener('click', () => {
    fetch('/api/swipe/like', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({userID: currentUserId}),

    }).then(data => {
        if (data.match){
            alert('You have a new match! Check your chats.')
        }
        loadNextUser();
    });
});

document.getElementById('dislike-btn')?.addEventListener('click', () => {
    fetch('/api/swipe/dislike', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({userID: currentUserId}),

    }).then(() => {
        loadNextUser();
    });
});



document.getElementById('dislike-btn')?.addEventListener('click', () => {
    fetch('/api/swipe/dislike', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    });
});


document.addEventListener('DOMContentLoaded', function() {
    const radioButtons = document.querySelectorAll('input[name="is_neurotypical"]');
    const divergenceSection = document.getElementById('divergence_section');

    if (radioButtons.length) {  
        radioButtons.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'no') {
                    divergenceSection.style.display = 'block';
                    document.getElementById('divergence').required = true;
                } else {
                    divergenceSection.style.display = 'none';
                    document.getElementById('divergence').required = false;
                }
            });
        });
    }
});

// File upload preview
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('profile_image');
    const filePreview = document.querySelector('.file-preview');
    const imagePreview = document.getElementById('image-preview');
    const fileName = document.querySelector('.file-name');
    const fileUpload = document.querySelector('.file-upload');

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    filePreview.style.display = 'block';
                    fileName.textContent = file.name;
                }
                
                reader.readAsDataURL(file);
            }
        });

        // Add drag and drop functionality
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileUpload.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            fileUpload.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileUpload.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            fileUpload.classList.add('border-primary');
        }

        function unhighlight(e) {
            fileUpload.classList.remove('border-primary');
        }

        fileUpload.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            fileInput.files = dt.files;
            
            if (file) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    filePreview.style.display = 'block';
                    fileName.textContent = file.name;
                }
                
                reader.readAsDataURL(file);
            }
        }
    }
});

window.addEventListener('load', () => {
    if (document.querySelector('.profile-container')) fetchUserProfile();
    if (document.querySelector('.chat-container')) fetchChatHistory();
    
    document.getElementById('ai-assistant-btn')?.addEventListener('click', handleAIAssistant);
    document.getElementById('conversation-accelerator-btn')?.addEventListener('click', handleConversationAccelerator);
});