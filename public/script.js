// Global variable for current user
let currentUser = null;

// Check if on login page
if (document.getElementById('login-form')) {
  // Form toggle
  document.getElementById('login-toggle').addEventListener('click', () => {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-toggle').classList.add('active');
    document.getElementById('register-toggle').classList.remove('active');
  });

  document.getElementById('register-toggle').addEventListener('click', () => {
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-toggle').classList.add('active');
    document.getElementById('login-toggle').classList.remove('active');
  });

  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
      currentUser = username;
      localStorage.setItem('currentUser', username);
      window.location.href = '/chat';
    } else {
      document.getElementById('message').textContent = data.error;
    }
  });

  // Register form
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
      document.getElementById('message').textContent = 'Registration successful! Please login.';
      document.getElementById('login-toggle').click();
    } else {
      document.getElementById('message').textContent = data.error;
    }
  });
}

// Check if on chat page
if (document.getElementById('chat-messages')) {
  currentUser = localStorage.getItem('currentUser');
  if (!currentUser) {
    window.location.href = '/';
  }

  let currentRoom = 'general';

  // Set user info
  const avatar = document.getElementById('user-avatar');
  avatar.textContent = currentUser.charAt(0).toUpperCase();
  document.getElementById('user-name').textContent = currentUser;

  // Load rooms
  async function loadRooms() {
    const response = await fetch('/rooms');
    const rooms = await response.json();
    const roomsList = document.getElementById('rooms-list');
    roomsList.innerHTML = '';
    rooms.forEach(room => {
      const roomDiv = document.createElement('div');
      roomDiv.className = `room-item ${room.id === currentRoom ? 'active' : ''}`;
      roomDiv.innerHTML = `<h4>${room.name}</h4><p>Click to join</p>`;
      roomDiv.addEventListener('click', () => switchRoom(room.id, room.name));
      roomsList.appendChild(roomDiv);
    });
  }

  // Load messages for current room
  async function loadMessages() {
    const response = await fetch(`/messages?room=${currentRoom}`);
    const messages = await response.json();
    const chatMessages = document.getElementById('chat-messages');
    const existingMessages = chatMessages.children.length;

    // Only update if there are new messages
    if (messages.length !== existingMessages) {
      chatMessages.innerHTML = '';
      messages.forEach(msg => {
        addMessageToUI(msg);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  // Update online users count
  async function updateOnlineCount() {
    const response = await fetch('/online-users');
    const data = await response.json();
    document.getElementById('online-count').textContent = `${data.count} online`;
  }

  // Add message to UI
  function addMessageToUI(msg) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.username === currentUser ? 'own' : 'other'}`;
    const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    messageDiv.innerHTML = `<strong>${msg.username}:</strong> ${msg.message}<div class="message-time">${time}</div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Switch room
  function switchRoom(roomId, roomName) {
    currentRoom = roomId;
    document.getElementById('room-name').textContent = roomName;
    document.querySelectorAll('.room-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.room-item').classList.add('active');
    loadMessages();
  }

  loadRooms();
  loadMessages();
  updateOnlineCount();
  setInterval(loadMessages, 1000); // Poll every 1 second for instant updates
  setInterval(updateOnlineCount, 5000); // Update online count every 5 seconds

  // Send message
  document.getElementById('message-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = document.getElementById('message-input').value.trim();
    if (message) {
      const response = await fetch('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, message, room: currentRoom })
      });
      if (response.ok) {
        document.getElementById('message-input').value = '';
        loadMessages(); // Immediately update messages
      }
    }
  });

  // Call buttons - enhanced with controls
  let currentStream = null;
  let isMuted = false;
  let isVideoOn = true;

  document.getElementById('voice-call-btn').addEventListener('click', async () => {
    await startCall(false);
  });

  document.getElementById('video-call-btn').addEventListener('click', async () => {
    await startCall(true);
  });

  async function startCall(isVideo = false) {
    try {
      const constraints = { audio: true, video: isVideo };
      currentStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create call UI
      const callContainer = document.createElement('div');
      callContainer.id = 'call-container';
      callContainer.innerHTML = `
        <div class="call-overlay">
          <div class="call-info">
            <h3>${isVideo ? 'Video' : 'Voice'} Call</h3>
            <p>Connected</p>
          </div>
          <div class="call-video" id="call-video"></div>
          <div class="call-controls">
            <button id="mute-btn" class="control-btn">🔇 Mute</button>
            ${isVideo ? '<button id="video-toggle-btn" class="control-btn">📹 Video Off</button>' : ''}
            <button id="end-call-btn" class="control-btn end-call">📞 End Call</button>
          </div>
        </div>
      `;
      document.body.appendChild(callContainer);

      if (isVideo) {
        const video = document.createElement('video');
        video.srcObject = currentStream;
        video.autoplay = true;
        video.muted = true; // Mute to avoid feedback
        video.style.width = '100%';
        video.style.maxWidth = '400px';
        video.style.borderRadius = '10px';
        document.getElementById('call-video').appendChild(video);
      } else {
        // For voice call, add audio element with low volume to allow local audio monitoring
        const audio = document.createElement('audio');
        audio.srcObject = currentStream;
        audio.autoplay = true;
        audio.volume = 0.1; // Low volume to avoid feedback but allow monitoring
        document.getElementById('call-video').appendChild(audio);
      }

      // Controls
      document.getElementById('mute-btn').addEventListener('click', toggleMute);
      if (isVideo) {
        document.getElementById('video-toggle-btn').addEventListener('click', toggleVideo);
      }
      document.getElementById('end-call-btn').addEventListener('click', endCall);

    } catch (err) {
      alert('Could not access media: ' + err.message);
    }
  }

  function toggleMute() {
    if (currentStream) {
      const audioTracks = currentStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      isMuted = !isMuted;
      const muteBtn = document.getElementById('mute-btn');
      muteBtn.textContent = isMuted ? '🔊 Unmute' : '🔇 Mute';
      muteBtn.classList.toggle('muted', isMuted);
    }
  }

  function toggleVideo() {
    if (currentStream) {
      const videoTracks = currentStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      isVideoOn = !isVideoOn;
      const videoBtn = document.getElementById('video-toggle-btn');
      videoBtn.textContent = isVideoOn ? '📹 Video Off' : '📷 Video On';
      const videoEl = document.querySelector('#call-video video');
      if (videoEl) {
        videoEl.style.opacity = isVideoOn ? '1' : '0.3';
      }
    }
  }

  function endCall() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    const callContainer = document.getElementById('call-container');
    if (callContainer) {
      callContainer.remove();
    }
    isMuted = false;
    isVideoOn = true;
  }

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  });
}
