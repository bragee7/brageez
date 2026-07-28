const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.env');

const config = {};

if (fs.existsSync(configPath)) {
  const configFile = fs.readFileSync(configPath, 'utf8');
  configFile.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    }
  });
} else {
  console.warn('⚠️ config.env not found, falling back to process.env');
}

const db = {
  host: config.DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: config.DB_PORT || process.env.DB_PORT || 3306,
  name: config.DB_NAME || process.env.DB_NAME || 'zelda_new',
  user: config.DB_USER || process.env.DB_USER || 'root',
  password: config.DB_PASSWORD || process.env.DB_PASSWORD || ''
};

const jwt = {
  secret: config.JWT_SECRET || process.env.JWT_SECRET || 'women-safety-guardian-secret-key-2024'
};

const email = {
  host: config.EMAIL_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: config.EMAIL_PORT || process.env.EMAIL_PORT || 587,
  user: config.EMAIL_USER || process.env.EMAIL_USER || '',
  pass: config.EMAIL_PASS || process.env.EMAIL_PASS || '',
  from: config.EMAIL_FROM || process.env.EMAIL_FROM || 'Women Safety Guardian <noreply@guaridan.com>',
  policeEmail: config.POLICE_EMAIL || process.env.POLICE_EMAIL || 'police@guardian.com'
};

const server = {
  port: config.PORT || process.env.PORT || 5000
};

const client = {
  url: config.CLIENT_URL || process.env.CLIENT_URL || 'http://localhost:3000',
  apiUrl: config.API_URL || process.env.API_URL || 'http://localhost:5000'
};

const validateConfig = () => {
  const required = [];
  const warnings = [];

  if (!db.host || !db.name || !db.user) {
    warnings.push('Database configuration may be incomplete');
  }

  if (!jwt.secret) {
    warnings.push('JWT secret not configured, using default');
  }

  if (!email.user || !email.pass) {
    warnings.push('Email not configured - SOS alerts will not be sent');
  }

  warnings.forEach(w => console.warn(`⚠️ ${w}`));

  if (required.length > 0) {
    console.error(`❌ Missing required config: ${required.join(', ')}`);
    process.exit(1);
  }
};

validateConfig();

module.exports = {
  config,
  db,
  jwt,
  email,
  server,
  client
};