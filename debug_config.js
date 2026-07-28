const fs = require('fs');

const configPath = 'C:\\Users\\Admin\\Downloads\\zenew-master\\zenew-master\\server\\config\\config.env';
const configFile = fs.readFileSync(configPath, 'utf8');

configFile.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key === 'EMAIL_PASS') {
      console.log(`EMAIL_PASS length: ${value.length}`);
      console.log(`EMAIL_PASS chars: ${JSON.stringify(value.split(''))}`);
      console.log(`EMAIL_PASS (raw): '${value}'`);
      console.log(`EMAIL_PASS cleaned (no spaces): '${value.replace(/\s/g,'')}'`);
    }
  }
});