const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDb } = require('./src/db');
const authRoutes = require('./src/routes/auth');
const sensorRoutes = require('./src/routes/sensors');
const lcdRoutes = require('./src/routes/lcd');
const ledRoutes = require('./src/routes/led');
const deviceRoutes = require('./src/routes/device');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sensor-data', sensorRoutes);
app.use('/api/lcd', lcdRoutes);
app.use('/api/led', ledRoutes);
app.use('/api/device', deviceRoutes);

// Catch-all route to serve index.html for SPA navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server after database schema initialization
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, HOST, () => {
      console.log('========================================================');
      console.log('   HOME AUTOMATION - IoT Control & Monitoring Server   ');
      console.log('   Designed & Developed by ADITI DHANDE               ');
      console.log('   Dept. of Electrical Engineering, GCOEY             ');
      console.log('========================================================');
      console.log(`Server is running at: http://localhost:${PORT}`);
      console.log(`Bound to host: ${HOST} (Ready for Render deployment)`);
      console.log(`Timezone: Asia/Kolkata (+05:30)`);
      console.log('========================================================');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
