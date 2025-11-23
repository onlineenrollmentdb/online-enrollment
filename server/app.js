const express = require('express');
const cors = require('cors');
const http = require('http');          // needed for socket.io
const { Server } = require('socket.io');
const path = require('path');          // ✅ <— missing import

const app = express();
const server = http.createServer(app); // wrap express with http server

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.use(cors());
app.use(express.json());

// ---------------------
// Serve uploads (for profile pictures, etc.)
// ---------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------------
// Register your routes
// ---------------------
const subjectsRoutes = require('./routes/subjectsRoutes');
const enrollmentsRoutes = require('./routes/enrollments');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const academicRoutes = require('./routes/academicRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const gradesRoutes = require('./routes/gradesRoutes');
const clearanceRoutes = require('./routes/clearanceRoutes');
const programsRoutes = require('./routes/programsRoutes');

app.use('/api/programs', programsRoutes);
app.use('/api/clearance', clearanceRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/notifications', notificationRoutes);

// ---------------------
// Socket.IO Events
// ---------------------
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Make io available globally (e.g., inside controllers)
app.set('io', io);

// ---------------------
// Start server
// ---------------------
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});
