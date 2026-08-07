const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

const config = require('./config');
const { pool } = require('./db');
const { initSocket } = require('./socket');
const authRoutes = require('./routes/auth');
const sosRoutes = require('./routes/sos');
const contactsRoutes = require('./routes/contacts');

const app = express();
const PORT = config.server.port;
const httpServer = http.createServer(app);

initSocket(httpServer);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const initDB = async () => {
  try {
    const connection = await pool.connect();
    console.log('✅ Database connected successfully!');
    console.log(`🐘 Postgres via Supabase`);
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
};

initDB();

app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/contacts', contactsRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Women Safety Guardian API is running',
    config: {
      db: config.db.connectionString ? 'supabase' : 'not configured',
      email: config.email.user ? 'configured' : 'not configured'
    }
  });
});

app.get('/api/config-status', (req, res) => {
  res.json({
    database: config.db.connectionString ? '✅ Connected' : '❌ Not configured',
    supabase: config.supabase.url && config.supabase.serviceRoleKey ? '✅ Configured' : '❌ Not configured',
    jwt: config.jwt.secret ? '✅ Configured' : '❌ Not configured',
    email: config.email.user && config.email.pass ? '✅ Configured' : '⚠️ Not configured (SOS emails will not be sent)',
    policeEmail: config.email.policeEmail || 'Not set'
  });
});

const distPath = path.join(__dirname, '../client/dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Women Safety Guardian running on http://localhost:${PORT}`);
  console.log(`🐘 Database: Supabase`);
  console.log(`📧 Email: ${config.email.user || 'Not configured'}`);
  console.log(`👮 Police Email: ${config.email.policeEmail}`);
});