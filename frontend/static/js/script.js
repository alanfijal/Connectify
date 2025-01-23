async function fetchUserProfile() {
    const response = await fetch('/api/profile');
    if (!response.ok) {
        console.error('Failed to fetch profile:', response.statusText);
        return;
    }

    const data = await response.json();
    console.log('Profile data:', data);

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
    try {
        const url = currentRecipient 
            ? `/api/chat/history?recipient_id=${currentRecipient}`
            : '/api/chat/history';
            
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch chat history');
        }
        const messages = await response.json();
        
        const messageContainer = document.getElementById('messages');
        
        // Compare with existing messages to avoid unnecessary updates
        const existingMessages = Array.from(messageContainer.children).map(el => ({
            sender_id: el.classList.contains('sent') ? currentUser : currentRecipient,
            text: el.querySelector('.message-text').textContent,
            timestamp: el.querySelector('.message-time').textContent
        }));

        // Only update if there are new messages
        if (JSON.stringify(messages) !== JSON.stringify(existingMessages)) {
            messageContainer.innerHTML = '';
            
            messages.forEach(message => {
                const messageElement = document.createElement('div');
                const isOwnMessage = message.sender_id === currentUser;
                
                messageElement.classList.add(
                    'chat-message',
                    isOwnMessage ? 'sent' : 'received'
                );
                
                messageElement.innerHTML = `
                    <span class="message-sender">${isOwnMessage ? 'You' : message.sender_name || 'Other'}</span>
                    <span class="message-text">${message.text}</span>
                    <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
                `;
                
                messageContainer.appendChild(messageElement);
            });
            
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
    } catch (error) {
        console.error('Error fetching chat history:', error);
    }
}


async function sendMessage() {
    const messageInput = document.getElementById('message');
    const message = messageInput.value.trim();
    
    if (!message) {
        console.log('No message to send');
        return;
    }
    
    if (!currentRecipient) {
        console.log('No recipient selected');
        return;
    }
    
    try {
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                message: message,
                recipient_id: currentRecipient
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to send message');
        }
        
        // Clear input only if message was sent successfully
        messageInput.value = '';
        
        // Refresh chat immediately
        await fetchChatHistory();
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
}



async function handleAIAssistant() {
    if (!currentRecipient) {
        alert('Please select a conversation first');
        return;
    }

    try {
        const response = await showAIPromptDialog();
    } catch (error) {
        console.error('Error with AI assistance:', error);
        alert('Failed to get AI assistance. Please try again.');
    }
}

function showAIPromptDialog() {
    return new Promise((resolve) => {
        const dialogHTML = `
            <div id="ai-prompt-dialog" class="modal">
                <div class="modal-content">
                    <h3>Ask AI Assistant</h3>
                    <p>What would you like help with?</p>
                    <select id="prompt-type">
                        <option value="suggest">Suggest a response</option>
                        <option value="explain">Explain communication style</option>
                        <option value="improve">Improve my last message</option>
                        <option value="custom">Custom question</option>
                    </select>
                    <textarea id="custom-prompt" 
                        style="display: none;" 
                        placeholder="Enter your question..."></textarea>
                    
                    <div id="ai-response" class="ai-response" style="display: none;">
                        <h4>AI Assistant's Response:</h4>
                        <div class="response-content"></div>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="cancel-prompt" class="btn-secondary">Close</button>
                        <button id="submit-prompt" class="btn-primary">Ask AI</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);

        const dialog = document.getElementById('ai-prompt-dialog');
        const promptType = document.getElementById('prompt-type');
        const customPrompt = document.getElementById('custom-prompt');
        const submitBtn = document.getElementById('submit-prompt');
        const cancelBtn = document.getElementById('cancel-prompt');
        const aiResponse = document.getElementById('ai-response');
        const responseContent = aiResponse.querySelector('.response-content');

        // Show/hide custom prompt based on selection
        promptType.addEventListener('change', () => {
            customPrompt.style.display = 
                promptType.value === 'custom' ? 'block' : 'none';
        });

        submitBtn.addEventListener('click', async () => {
            let finalPrompt;
            if (promptType.value === 'custom') {
                finalPrompt = customPrompt.value.trim();
                if (!finalPrompt) {
                    alert('Please enter your question');
                    return;
                }
            } else {
                const prompts = {
                    'suggest': 'Please suggest an appropriate response for this conversation.',
                    'explain': 'Please explain the communication style being used and how I can better adapt to it.',
                    'improve': 'Please analyze my last message and suggest improvements.'
                };
                finalPrompt = prompts[promptType.value];
            }

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Loading...';
            
            try {
                const response = await fetch('/api/ai-assist', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        recipient_id: currentRecipient,
                        user_prompt: finalPrompt
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to get AI assistance');
                }

                const data = await response.json();
                
                // Show the response
                responseContent.textContent = data.response;
                aiResponse.style.display = 'block';
                
                // Change button text and behavior
                submitBtn.textContent = 'Ask Another Question';
                submitBtn.disabled = false;
                
                // Clear the custom prompt if it was used
                if (promptType.value === 'custom') {
                    customPrompt.value = '';
                }
                
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to get AI assistance. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Ask AI';
            }
        });

        cancelBtn.addEventListener('click', () => {
            dialog.remove();
            resolve();
        });
    });
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
    try {
        const response = await fetch('/api/swipe/next');
        const data = await response.json();
        if (response.ok) {
            window.currentUserId = data._id;
            const userCard = document.getElementById('user-card');
            userCard.innerHTML = `
                <img src="${data.image_url}" alt="${data.name}" class="user-image">
                <div class="user-details">
                    <h2>${data.name}</h2>
                    <p>${data.bio}</p>
                    <p><strong>Interests:</strong> ${data.interests.join(', ')}</p>
                </div>
            `;
        } else {
            const userCard = document.getElementById('user-card');
            userCard.innerHTML = '<p>No more users to show</p>';
        }
    } catch (error) {
        console.error('Error loading next user:', error);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message');
    if (messageInput) {
        messageInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await sendMessage();
            }
        });
    }
    
    const sendButton = document.getElementById('send-btn');
    if (sendButton) {
        sendButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await sendMessage();
        });
    }
});

document.getElementById('like-btn')?.addEventListener('click', () => {
    if (!window.currentUserId) {
        console.error('No user ID available');
        return;
    }

    fetch('/api/swipe/like', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userID: window.currentUserId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.match) {
            showMatchModal(data.matchedUser);
        }
        loadNextUser();
    })
    .catch(error => console.error('Error liking user:', error));
});

document.getElementById('dislike-btn')?.addEventListener('click', () => {
    if (!window.currentUserId) {
        console.error('No user ID available');
        return;
    }

    fetch('/api/swipe/dislike', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userID: window.currentUserId })
    })
    .then(() => loadNextUser())
    .catch(error => console.error('Error disliking user:', error));
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

    if (document.querySelector('.swipe-container')) {
        loadNextUser();  
    }
});

function showEditForm() {
    const data = window.currentProfileData;
    if (!data) return;

    document.getElementById('edit-username').value = data.username;
    document.getElementById('edit-email').value = data.email;
    document.getElementById('edit-age').value = data.age;
    document.getElementById('edit-bio').value = data.bio;
    document.getElementById('edit-interests').value = (data.interests || []).join(', ');
    
    const radioButtons = document.getElementsByName('edit-is-neurotypical');
    for (const radio of radioButtons) {
        if ((radio.value === 'yes' && data.is_neurotypical) || 
            (radio.value === 'no' && !data.is_neurotypical)) {
            radio.checked = true;
        }
    }

    const divergenceSection = document.getElementById('edit-divergence-section');
    if (!data.is_neurotypical) {
        divergenceSection.style.display = 'block';
        const checkboxes = document.getElementsByName('edit-divergence[]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = data.neurodivergences?.includes(checkbox.value) || false;
        });
    }

    document.getElementById('edit-form').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function() {

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

   
    const radioButtons = document.getElementsByName('edit-is-neurotypical');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            const divergenceSection = document.getElementById('edit-divergence-section');
            divergenceSection.style.display = this.value === 'no' ? 'block' : 'none';
        });
    });
});

function showMatchModal(matchedUser) {
    const modalHTML = `
        <div id="match-modal" class="match-modal">
            <div class="match-modal-content">
                <div class="match-header">
                    <h2>🎉 It's a Match! 🎉</h2>
                    <div class="match-hearts">🔥✨🔥</div>
                </div>
                <p>You and ${matchedUser?.username || 'someone'} liked each other!</p>
                <div class="match-actions">
                    <button class="btn-primary" onclick="window.location.href='/chat'">Start Chatting</button>
                    <button class="btn-secondary" onclick="closeMatchModal()">Continue Swiping</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const modal = document.getElementById('match-modal');
        modal.classList.add('show');
    }, 50);
}

function closeMatchModal() {
    const modal = document.getElementById('match-modal');
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
}

let chatRefreshInterval;
function startChatRefresh() {
    // Increase refresh interval to 5 seconds
    chatRefreshInterval = setInterval(fetchChatHistory, 15000);
}

function stopChatRefresh() {
    if (chatRefreshInterval) {
        clearInterval(chatRefreshInterval);
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopChatRefresh();
    } else {
        startChatRefresh();
    }
});


if (document.querySelector('.chat-container')) {
    currentUser = document.querySelector('meta[name="username"]')?.content;
    
    
    fetchMatches();
    fetchChatHistory();
    startChatRefresh();
    
    
    setInterval(fetchMatches, 30000); 
}

let currentRecipient = null;

async function fetchMatches() {
    try {
        const response = await fetch('/api/matches');
        if (!response.ok) {
            throw new Error('Failed to fetch matches');
        }
        const matches = await response.json();
        
        const matchesList = document.getElementById('matches-list');
        matchesList.innerHTML = '';
        
        matches.forEach(match => {
            const matchElement = document.createElement('div');
            matchElement.classList.add('match-item');
            if (match.id === currentRecipient) {
                matchElement.classList.add('active');
            }
            
            matchElement.innerHTML = `
                <img src="${match.profile_image}" alt="${match.username}" class="match-avatar">
                <span class="match-name">${match.username}</span>
            `;
            
            matchElement.addEventListener('click', () => {
                document.querySelectorAll('.match-item').forEach(el => {
                    el.classList.remove('active');
                });
                
                matchElement.classList.add('active');
                
                currentRecipient = match.id;
                document.getElementById('current-chat-user').textContent = match.username;
                
                fetchChatHistory();
            });
            
            matchesList.appendChild(matchElement);
        });
    } catch (error) {
        console.error('Error fetching matches:', error);
    }
}

async function searchArticles() {
    const searchTerm = document.getElementById('articleSearch').value.toLowerCase();
    const articlesContainer = document.querySelector('.articles-container');
    
    try {
        const response = await fetch('/api/articles');
        const articles = await response.json();
        
        const filteredArticles = articles.filter(article => 
            article.title.toLowerCase().includes(searchTerm) ||
            article.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
        
        articlesContainer.innerHTML = filteredArticles.length 
            ? filteredArticles.map(article => `
                <div class="article-card">
                    <h3>${article.title}</h3>
                    <div class="article-tags">
                        ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <p>${article.excerpt}</p>
                    <a href="/article/${article.id}" class="read-more">Read More</a>
                </div>
            `).join('')
            : '<div class="article-placeholder"><p>No articles found matching your search.</p></div>';
            
    } catch (error) {
        console.error('Error fetching articles:', error);
        articlesContainer.innerHTML = '<div class="article-placeholder"><p>Error loading articles. Please try again later.</p></div>';
    }
}

// Add event listener for search input
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('articleSearch');
    if (searchInput) {
        // Initial load of articles
        searchArticles();
        
        // Add debounced search functionality
        let timeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(searchArticles, 300);
        });
    }
});

let currentChannel = null;

async function loadChannels() {
    try {
        const response = await fetch('/api/channels');
        const channels = await response.json();
        
        const channelsList = document.getElementById('channels-list');
        channelsList.innerHTML = channels.map(channel => `
            <div class="channel-item" data-channel-id="${channel.channel_id}">
                <div class="channel-info">
                    <h3>${channel.name}</h3>
                    <p>${channel.description}</p>
                    <span class="member-count">${channel.member_count} members</span>
                </div>
                <button class="join-btn ${channel.is_member ? 'leave' : 'join'}">
                    ${channel.is_member ? 'Leave' : 'Join'}
                </button>
            </div>
        `).join('');

        // Add click handlers for channel selection
        document.querySelectorAll('.channel-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('join-btn')) {
                    const channelId = item.dataset.channelId;
                    // Remove active class from all channels
                    document.querySelectorAll('.channel-item').forEach(ch => ch.classList.remove('active'));
                    // Add active class to selected channel
                    item.classList.add('active');
                    loadChannel(channelId);
                }
            });
        });

        // Add click handlers for join/leave buttons
        document.querySelectorAll('.join-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const channelItem = e.target.closest('.channel-item');
                const channelId = channelItem.dataset.channelId;
                const isLeaving = e.target.classList.contains('leave');
                
                try {
                    const response = await fetch(`/api/channels/${channelId}/${isLeaving ? 'leave' : 'join'}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        // Update button state immediately
                        e.target.textContent = isLeaving ? 'Join' : 'Leave';
                        e.target.classList.toggle('leave');
                        e.target.classList.toggle('join');
                        
                        // Refresh channel list to update member counts
                        loadChannels();
                        
                        if (currentChannel === channelId && isLeaving) {
                            currentChannel = null;
                            document.getElementById('current-channel').innerHTML = '<h1>Select a Channel</h1>';
                            document.querySelector('.channel-content').style.display = 'none';
                        } else if (currentChannel === channelId) {
                            // Refresh current channel view if we're looking at it
                            loadChannel(channelId);
                        }

                        // Show success message
                        const message = isLeaving ? 'Successfully left the channel' : 'Successfully joined the channel';
                        alert(message);
                    } else {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to join/leave channel');
                    }
                } catch (error) {
                    console.error('Error joining/leaving channel:', error);
                    alert(error.message || 'Failed to join/leave channel. Please try again.');
                    // Revert button state on error
                    loadChannels();
                }
            });
        });
    } catch (error) {
        console.error('Error loading channels:', error);
        const channelsList = document.getElementById('channels-list');
        channelsList.innerHTML = `
            <div class="error-message">
                <p>Error loading channels. Please try again later.</p>
            </div>
        `;
    }
}

async function loadChannel(channelId) {
    try {
        const response = await fetch(`/api/channels/${channelId}`);
        if (!response.ok) throw new Error('Failed to load channel');
        
        const channel = await response.json();
        console.log('Channel data:', channel); // Debug log
        currentChannel = channelId;
        
        // Update channel header
        document.getElementById('current-channel').innerHTML = `
            <h1>${channel.name}</h1>
            <p>${channel.description}</p>
        `;
        

        
        
        // Update messages
        const messagesContainer = document.getElementById('channel-messages');
        if (channel.messages && channel.messages.length > 0) {
            messagesContainer.innerHTML = channel.messages.map(msg => `
                <div class="message">
                    <strong>${msg.sender_name || 'Unknown User'}</strong>
                    <p>${msg.text}</p>
                    <span class="timestamp">${new Date(msg.timestamp).toLocaleString()}</span>
                </div>
            `).join('');
        } else {
            messagesContainer.innerHTML = '<div class="no-messages">No messages yet</div>';
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Update members list
        const membersList = document.getElementById('members-list');
        if (channel.members && channel.members.length > 0) {
            membersList.innerHTML = channel.members.map(member => `
                <div class="member-item">
                    <img src="${member.profile_image}" alt="${member.username}" class="member-avatar">
                    <span>${member.username}</span>
                </div>
            `).join('');
        } else {
            membersList.innerHTML = '<div class="no-members">No members yet</div>';
        }
        
        // Update events list with join/leave functionality and participant view
        const eventsList = document.getElementById('events-list');
        if (channel.events && channel.events.length > 0) {
            eventsList.innerHTML = channel.events.map(event => {
                // Debug logs
                console.log('Event:', event.title);
                console.log('Event participants:', event.participants);
                console.log('Current user ID:', currentUserId);
                
                // Ensure all IDs are strings and check participation
                const isParticipant = event.participants.some(pid => String(pid) === String(currentUserId));
                console.log('Is participant:', isParticipant);

                return `
                    <div class="event-item" data-event-id="${event.id}">
                        <div class="event-content">
                            <h4>${event.title}</h4>
                            <p>${event.description}</p>
                            <div class="event-details">
                                <span>Date: ${event.date}</span>
                                <span>Time: ${event.time}</span>
                                <span class="participants-count">
                                    Participants: ${event.participants.length}
                                </span>
                            </div>
                            <div class="event-participants" id="participants-${event.id}" style="display: none;">
                                <h5>Participants</h5>
                                <div class="participants-list">Loading...</div>
                            </div>
                        </div>
                        <button class="event-action-btn ${isParticipant ? 'leave' : 'join'}">
                            ${isParticipant ? 'Leave Event' : 'Join Event'}
                        </button>
                    </div>
                `;
            }).join('');

            // Add event listeners for join/leave buttons
            document.querySelectorAll('.event-action-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const eventId = e.target.closest('.event-item').dataset.eventId;
                    const isLeaving = e.target.classList.contains('leave');
                    
                    try {
                        const response = await fetch(`/api/channels/${channelId}/events/${eventId}/${isLeaving ? 'leave' : 'join'}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        if (response.ok) {
                            // Refresh channel to update event participants
                            loadChannel(channelId);
                        } else {
                            const error = await response.json();
                            throw new Error(error.error || `Failed to ${isLeaving ? 'leave' : 'join'} event`);
                        }
                    } catch (error) {
                        console.error('Error with event action:', error);
                        alert(error.message || 'Failed to perform action. Please try again.');
                    }
                });
            });

            // Add click listeners for showing/hiding participants
            document.querySelectorAll('.event-item').forEach(item => {
                item.addEventListener('click', async (e) => {
                    if (e.target.classList.contains('event-action-btn')) return;
                    
                    const eventId = item.dataset.eventId;
                    const participantsDiv = document.getElementById(`participants-${eventId}`);
                    
                    if (participantsDiv.style.display === 'none') {
                        try {
                            const response = await fetch(`/api/channels/${channelId}/events/${eventId}/participants`);
                            if (response.ok) {
                                const data = await response.json();
                                participantsDiv.querySelector('.participants-list').innerHTML = data.participants.length > 0 
                                    ? data.participants.map(p => `
                                        <div class="participant">
                                            <img src="${p.profile_image}" alt="${p.username}" class="participant-avatar">
                                            <span>${p.username}</span>
                                        </div>
                                    `).join('')
                                    : '<p>No participants yet</p>';
                            } else {
                                throw new Error('Failed to load participants');
                            }
                        } catch (error) {
                            console.error('Error loading participants:', error);
                            participantsDiv.querySelector('.participants-list').innerHTML = 
                                '<p class="error">Failed to load participants</p>';
                        }
                        participantsDiv.style.display = 'block';
                    } else {
                        participantsDiv.style.display = 'none';
                    }
                });
            });
        } else {
            eventsList.innerHTML = '<div class="no-events">No events scheduled</div>';
        }

        // Show the channel content
        document.querySelector('.channel-content').style.display = 'block';

    } catch (error) {
        console.error('Error loading channel:', error);
        document.getElementById('current-channel').innerHTML = `
            <div class="error-message">
                <h1>Error Loading Channel</h1>
                <p>There was a problem loading the channel. Please try again later.</p>
                <p>Error: ${error.message}</p>
            </div>
        `;
        document.querySelector('.channel-content').style.display = 'none';
    }
}

// Handle tab switching
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.channels-container')) {
        // Load initial channels
        loadChannels();
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                btn.classList.add('active');
                document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
            });
        });
        
        // Handle message sending
        const sendButton = document.getElementById('send-channel-msg');
        const messageInput = document.getElementById('channel-message');
        
        const sendChannelMessage = async () => {
            if (!currentChannel) return;
            
            const message = messageInput.value.trim();
            if (!message) return;
            
            try {
                const response = await fetch(`/api/channels/${currentChannel}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message })
                });
                
                if (response.ok) {
                    messageInput.value = '';
                    loadChannel(currentChannel); // Refresh channel
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        };
        
        sendButton.addEventListener('click', sendChannelMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChannelMessage();
            }
        });
        
        // Handle channel creation
        document.getElementById('create-channel-btn').addEventListener('click', () => {
            showCreateChannelModal();
        });
        
        // Handle event creation
        document.getElementById('create-event-btn').addEventListener('click', () => {
            if (!currentChannel) {
                alert('Please select a channel first');
                return;
            }
            showCreateEventModal();
        });
    }
});

function showCreateChannelModal() {
    const modalHTML = `
        <div id="create-channel-modal" class="modal">
            <div class="modal-content">
                <h3>Create New Channel</h3>
                <form id="create-channel-form">
                    <div class="form-group">
                        <label for="channel-name">Channel Name</label>
                        <input type="text" id="channel-name" required>
                    </div>
                    <div class="form-group">
                        <label for="channel-description">Description</label>
                        <textarea id="channel-description" required></textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" id="cancel-channel">Cancel</button>
                        <button type="submit" class="btn-primary">Create Channel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('create-channel-modal');
    const form = document.getElementById('create-channel-form');
    const cancelBtn = document.getElementById('cancel-channel');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('channel-name').value.trim();
        const description = document.getElementById('channel-description').value.trim();

        try {
            const response = await fetch('/api/channels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, description })
            });

            if (response.ok) {
                modal.remove();
                loadChannels(); // Refresh channels list
                const data = await response.json();
                loadChannel(data.id); // Load the newly created channel
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to create channel');
            }
        } catch (error) {
            console.error('Error creating channel:', error);
            alert('Failed to create channel');
        }
    });

    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });
}

function showCreateEventModal() {
    const modalHTML = `
        <div id="create-event-modal" class="modal">
            <div class="modal-content">
                <h3>Create New Event</h3>
                <form id="create-event-form">
                    <div class="form-group">
                        <label for="event-title">Event Title</label>
                        <input type="text" id="event-title" required>
                    </div>
                    <div class="form-group">
                        <label for="event-description">Description</label>
                        <textarea id="event-description" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="event-date">Date</label>
                        <input type="date" id="event-date" required>
                    </div>
                    <div class="form-group">
                        <label for="event-time">Time</label>
                        <input type="time" id="event-time" required>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" id="cancel-event">Cancel</button>
                        <button type="submit" class="btn-primary">Create Event</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('create-event-modal');
    const form = document.getElementById('create-event-form');
    const cancelBtn = document.getElementById('cancel-event');

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('event-date').min = today;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('event-title').value.trim();
        const description = document.getElementById('event-description').value.trim();
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;

        try {
            const response = await fetch(`/api/channels/${currentChannel}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description,
                    date,
                    time
                })
            });

            if (response.ok) {
                modal.remove();
                loadChannel(currentChannel); // Refresh channel to show new event
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to create event');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Failed to create event');
        }
    });

    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });
}

// Add this at the start of your script
let currentUserId = null;

// Add this function to get the current user's ID
async function getCurrentUserId() {
    try {
        const response = await fetch('/api/profile');
        if (response.ok) {
            const data = await response.json();
            currentUserId = String(data.id); // Convert to string
            console.log('Current user ID:', currentUserId); // Debug
        }
    } catch (error) {
        console.error('Error getting current user:', error);
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await getCurrentUserId();
    // ... rest of your initialization code ...
});