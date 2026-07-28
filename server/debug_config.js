const fs = require('fs');
const path = require('path');

const configPath = 'C:\\Users\\Admin\\Downloads\\zenew-master\\zenew-master\\server\\config\\config.env';

const configFile = fs.readFileSync(configPath, 'utf8');
console.log('=== Config Values ===');
configFile.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value) {
      const displayVal = (key.includes('PASS') || key.includes('PASSWORD')) ? '********' : value;
      console.log(`${key} => '${displayVal}'`);
    }
  }
});