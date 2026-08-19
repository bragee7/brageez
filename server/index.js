const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { pool } = require('./db');
const { initSocket } = require('./socket');
const authRoutes = require('./routes/auth');
const sosRoutes = require('./routes/sos');
const contactsRoutes = require('./routes/contacts');
const adminRoutes = require('./routes/admin');
const preferencesRoutes = require('./routes/preferences');

const app = express();
const PORT = config.server.port;
const httpServer = http.createServer(app);

initSocket(httpServer);

app.set('trust proxy', 1);

const rateLimitMsg = 'Too many requests. Please try again later.';
const rlWindowMs = Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000;
const rlMax = Number(process.env.RATE_LIMIT_MAX) || 300;

const generalLimiter = rateLimit({
  windowMs: rlWindowMs,
  max: rlMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: rateLimitMsg }
});

const strictLimiter = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: rateLimitMsg }
  });

app.use('/api/', generalLimiter);
app.use('/api/auth/login', strictLimiter(rlWindowMs, 10));
app.use('/api/auth/register', strictLimiter(60 * 60 * 1000, 5));
app.use('/api/auth/verify-otp', strictLimiter(rlWindowMs, 10));
app.use('/api/auth/resend-otp', strictLimiter(rlWindowMs, 10));
app.post('/api/sos', strictLimiter(rlWindowMs, 10));

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
app.use('/api/admin', adminRoutes);
  app.use('/api/preferences', preferencesRoutes);

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
  const supabaseConfigured = config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey);
  res.json({
    database: config.db.connectionString ? '✅ Connected' : '❌ Not configured',
    supabase: supabaseConfigured ? '✅ Configured' : '❌ Not configured',
    jwt: config.jwt.secret ? '✅ Configured' : '❌ Not configured',
    email: config.email.sendgridApiKey ? '✅ Configured (SendGrid)' : '⚠️ Not configured (SOS emails will not be sent)',
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