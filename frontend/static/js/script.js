async function fetchUserProfile() {
    const response = await fetch('/api/profile');
    if (!response.ok) {
        console.error('Failed to fetch profile:', response.statusText);
        return;
    }

    const data = await response.json();
    console.log('Profile data:', data);

    // Update profile image and details
    const profileImage = document.getElementById('profile-image');
    if (profileImage) {
        profileImage.src = data.profile_image_url || '/static/images/default-profile.png';
    }

    document.querySelector('.profile-details').innerHTML = `
        <div class="profile-image">
            <img id="profile-image" src="${data.profile_image_url || '/static/images/default-profile.png'}" alt="Profile Image">
        </div>
        <p><strong>Username: </strong>${data.username}</p>
        <p><strong>Email: </strong>${data.email}</p>
        <p><strong>Age: </strong>${data.age}</p>
        <p><strong>Bio: </strong>${data.bio}</p>
        <p><strong>Neurotypical: </strong>${data.is_neurotypical ? 'Yes' : 'No'}</p>
        ${!data.is_neurotypical ? `<p><strong>Neurodivergences: </strong>${(data.neurodivergences || []).join(', ')}</p>` : ''}
        <p><strong>Interests: </strong>${(data.interests || []).join(', ')}</p>`;

    // Store the current data for the edit form
    window.currentProfileData = data;
}

async function updateUserProfile() {
   
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const isNeurotypical = document.querySelector('[name="is_neurotypical"]:checked').value === 'yes';
    
    let neurodivergences = null;
    if (!isNeurotypical) {
      
        const divergenceElements = document.querySelectorAll('[name="divergence[]"]:checked');
        neurodivergences = Array.from(divergenceElements).map(el => el.value);
    }

    const age = parseInt(document.getElementById('age').value, 10);
    const bio = document.getElementById('bio').value;
    const interestsStr = document.getElementById('interests').value; 
    const interests = interestsStr
        ? interestsStr.split(',').map(s => s.trim())
        : [];

   
    const bodyData = {
        username: username,
        email: email,
        is_neurotypical: isNeurotypical,
        neurodivergences: neurodivergences,
        age: age,
        bio: bio,
        interests: interests
    };

    try {
        const response = await fetch('/api/profile', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const result = await response.json();
        if (response.ok) {
            if (result.message) {
                alert(result.message);      
            } else if (result.warning) {
                alert(result.warning);      
            }
            
            fetchUserProfile();
        } else {
           
            alert(result.error || 'Something went wrong updating profile.');
        }
    } catch (error) {
        console.error('Update profile error:', error);
        alert('An unexpected error occurred while updating profile.');
    }
}


async function fetchChatHistory() {
    const response = await fetch('/api/chat-history');
    const data = await response.json();
    const messageContainer = document.getElementById('messages');
    messageContainer.innerHTML = '';
    data.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add(
            'chat-message',
            message.sender === 'You' ? 'sent' : 'received'
        );
        messageElement.textContent = `${message.sender}: ${message.text}`;
        messageContainer.appendChild(messageElement);
    });
}


async function sendMessage() {
    const messageInput = document.getElementById('message');
    const message = messageInput.value;
    if (message.trim() !== '') {
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message })
        });
        if (response.ok) {
            messageInput.value = '';
            fetchChatHistory();
        }
    }
}


async function handleAIAssistant() {
    const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    });
    if (response.ok) {
        fetchChatHistory();
    }
}


async function handleConversationAccelerator() {
    const response = await fetch('/api/accelerate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    });
    if (response.ok) {
        fetchChatHistory();
    }
}


async function loadNextUser() {
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
        body: JSON.stringify({ userID: currentUserId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.match) {
            alert('You have a new match! Check your chats.');
        }
        loadNextUser();
    });
});

document.getElementById('dislike-btn')?.addEventListener('click', () => {
    fetch('/api/swipe/dislike', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userID: currentUserId })
    })
    .then(() => {
        loadNextUser();
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
                };
                reader.readAsDataURL(file);
            }
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileUpload.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
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
                };
                reader.readAsDataURL(file);
            }
        }
    }
});


window.addEventListener('load', () => {
    if (document.querySelector('.profile-container')) {
        fetchUserProfile();
    }

    if (document.querySelector('.chat-container')) {
        fetchChatHistory();
    }

    document.getElementById('ai-assistant-btn')?.addEventListener('click', handleAIAssistant);
    document.getElementById('conversation-accelerator-btn')?.addEventListener('click', handleConversationAccelerator);
});

// Add these new functions for edit functionality
function showEditForm() {
    const data = window.currentProfileData;
    if (!data) return;

    // Populate the edit form
    document.getElementById('edit-username').value = data.username;
    document.getElementById('edit-email').value = data.email;
    document.getElementById('edit-age').value = data.age;
    document.getElementById('edit-bio').value = data.bio;
    document.getElementById('edit-interests').value = (data.interests || []).join(', ');
    
    // Set neurotypical status
    const radioButtons = document.getElementsByName('edit-is-neurotypical');
    for (const radio of radioButtons) {
        if ((radio.value === 'yes' && data.is_neurotypical) || 
            (radio.value === 'no' && !data.is_neurotypical)) {
            radio.checked = true;
        }
    }

    // Show/hide and set neurodivergences
    const divergenceSection = document.getElementById('edit-divergence-section');
    if (!data.is_neurotypical) {
        divergenceSection.style.display = 'block';
        const checkboxes = document.getElementsByName('edit-divergence[]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = data.neurodivergences?.includes(checkbox.value) || false;
        });
    }

    // Show the edit form
    document.getElementById('edit-form').style.display = 'block';
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    // ... existing DOMContentLoaded code ...

    const editProfileBtn = document.getElementById('edit-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editForm = document.getElementById('profile-edit-form');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', showEditForm);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            document.getElementById('edit-form').style.display = 'none';
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const isNeurotypical = document.querySelector('input[name="edit-is-neurotypical"]:checked').value === 'yes';
            let neurodivergences = null;
            if (!isNeurotypical) {
                const checkedDivergences = document.querySelectorAll('input[name="edit-divergence[]"]:checked');
                neurodivergences = Array.from(checkedDivergences).map(cb => cb.value);
            }

            const formData = {
                username: document.getElementById('edit-username').value,
                email: document.getElementById('edit-email').value,
                age: parseInt(document.getElementById('edit-age').value),
                bio: document.getElementById('edit-bio').value,
                interests: document.getElementById('edit-interests').value.split(',').map(i => i.trim()),
                is_neurotypical: isNeurotypical,
                neurodivergences: neurodivergences
            };

            try {
                const response = await fetch('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();
                if (response.ok) {
                    alert(result.message || 'Profile updated successfully');
                    document.getElementById('edit-form').style.display = 'none';
                    fetchUserProfile();
                } else {
                    alert(result.error || 'Failed to update profile');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('An error occurred while updating the profile');
            }
        });
    }

    // Add listener for neurotypical radio buttons in edit form
    const radioButtons = document.getElementsByName('edit-is-neurotypical');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            const divergenceSection = document.getElementById('edit-divergence-section');
            divergenceSection.style.display = this.value === 'no' ? 'block' : 'none';
        });
    });
});
