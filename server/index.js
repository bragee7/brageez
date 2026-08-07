const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

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
  const supabaseConfigured = config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey);
  res.json({
    database: config.db.connectionString ? '✅ Connected' : '❌ Not configured',
    supabase: supabaseConfigured ? '✅ Configured' : '❌ Not configured',
    jwt: config.jwt.secret ? '✅ Configured' : '❌ Not configured',
    email: config.email.user && config.email.pass ? '✅ Configured' : '⚠️ Not configured (SOS emails will not be sent)',
    policeEmail: config.email.policeEmail || 'Not set'
  });
});

app.get('/api/debug-smtp', async (req, res) => {
  const net = require('net');
  const dnsLib = require('dns');
  const result = { dns: null, v4connect: null, v6connect: null };
  try {
    result.dns = await new Promise((resolve) => {
      dnsLib.resolve4('smtp.gmail.com', (e4, a4) => {
        dnsLib.resolve6('smtp.gmail.com', (e6, a6) => {
          resolve({ a4: e4 ? e4.message : a4, a6: e6 ? e6.message : a6, order: dnsLib.getDefaultResultOrder() });
        });
      });
    });
  } catch (e) { result.dns = e.message; }

  const tryConnect = (host, family) => new Promise((resolve) => {
    const sock = new net.Socket();
    const done = (ok, info) => { sock.destroy(); resolve({ ok, info }); };
    sock.setTimeout(5000);
    sock.once('connect', () => done(true, 'connected'));
    sock.once('timeout', () => done(false, 'timeout'));
    sock.once('error', (e) => done(false, e.code || e.message));
    sock.connect(587, host, () => {});
  });

  const a4 = (result.dns && Array.isArray(result.dns.a4) && result.dns.a4[0]) || null;
  result.v4connect = a4 ? await tryConnect(a4, 4) : 'no A record';
  const a6 = (result.dns && Array.isArray(result.dns.a6) && result.dns.a6[0]) || null;
  result.v6connect = a6 ? await tryConnect(a6, 6) : 'no AAAA record';

  res.json(result);
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