const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env variables
dotenv.config({ path: __dirname + '/.env' });

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const setupChatSocket = require('./socket/chatHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const mentorRoutes = require('./routes/mentorRoutes');
const matchRoutes = require('./routes/matchRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // In production, restrict to frontend URL
    methods: ['GET', 'POST'],
  },
});

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'PeerSync Backend',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'PeerSync Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth (signup, login, me)',
      students: '/api/students (profile, onboarding, become-mentor)',
      mentors: '/api/mentors (list, stats, profile)',
      matches: '/api/matches (find, recent)',
      sessions: '/api/sessions (start, end, list)',
      feedback: '/api/feedback (submit, get)',
      health: '/api/health',
    },
  });
});

// --- Error Handler (must be last) ---
app.use(errorHandler);

// --- Setup Socket.IO ---
setupChatSocket(io);

// --- Connect to DB & Start Server ---
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log('  🚀 PeerSync Backend Server Running');
    console.log(`  📡 Port: ${PORT}`);
    console.log(`  🔗 URL: http://localhost:${PORT}`);
    console.log(`  💬 WebSocket: Ready`);
    console.log('='.repeat(50));
    console.log('');
  });
});
