const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// In-memory storage for users and messages
let users = [];
let messages = [];
let onlineUsers = new Set();
let chatRooms = {
  'general': { name: 'General Chat', messages: [] },
  'random': { name: 'Random', messages: [] },
  'tech': { name: 'Tech Talk', messages: [] }
};
let currentRoom = 'general';

// Track online users
let activeSessions = new Set();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (users.find(user => user.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  users.push({ username, password });
  res.json({ message: 'Registration successful' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // Track online users
  activeSessions.add(username);
  res.json({ message: 'Login successful', username });
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/messages', (req, res) => {
  const room = req.query.room || 'general';
  res.json(chatRooms[room] ? chatRooms[room].messages : []);
});

app.post('/messages', (req, res) => {
  const { username, message, room } = req.body;
  const targetRoom = room || 'general';
  if (!username || !message) {
    return res.status(400).json({ error: 'Username and message required' });
  }
  if (!chatRooms[targetRoom]) {
    return res.status(400).json({ error: 'Invalid room' });
  }
  chatRooms[targetRoom].messages.push({ username, message, timestamp: new Date() });
  res.json({ message: 'Message sent' });
});

app.get('/rooms', (req, res) => {
  res.json(Object.keys(chatRooms).map(id => ({ id, name: chatRooms[id].name })));
});

app.get('/online-users', (req, res) => {
  res.json({ count: activeSessions.size });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
