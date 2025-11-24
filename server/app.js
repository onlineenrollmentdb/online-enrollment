const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();    // <== Make sure env works

const app = express();
const server = http.createServer(app);

// ---------------------
// CORS CONFIG
// ---------------------
const allowedOrigins = [
  'https://ctudb-oes.vercel.app', // frontend URL without trailing slash
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // allow non-browser tools like Postman
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'CORS policy does not allow access from this origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// ---------------------
// SOCKET.IO CONFIG
// ---------------------
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// ---------------------
app.use(express.json());

// ---------------------
// Serve uploads
// ---------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------------
// Register routes
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
// Socket Events
// ---------------------
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Make io available everywhere
app.set('io', io);

// ---------------------
// Start server
// ---------------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});


app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1+1 AS result');
    res.json({ success: true, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
