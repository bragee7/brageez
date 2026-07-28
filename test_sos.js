const axios = require('axios');

async function testSOS() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'user@guardian.com',
      password: 'user123'
    });
    
    const token = loginRes.data.token;
    console.log('Login OK:', loginRes.data.user.email);
    
    const formData = new FormData();
    formData.append('locationLink', 'https://www.google.com/maps?q=40.7128,-74.0060');
    formData.append('latitude', '40.7128');
    formData.append('longitude', '-74.0060');
    formData.append('notes', 'Test SOS with coordinates');
    
    const sosRes = await axios.post('http://localhost:5000/api/sos', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('SOS created:', sosRes.data.case ? 'OK' : 'FAILED');
    console.log('  latitude stored:', sosRes.data.case?.latitude);
    console.log('  longitude stored:', sosRes.data.case?.longitude);
    console.log('  locationLink:', sosRes.data.case?.locationLink);
    
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testSOS();