import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sosAPI, contactsAPI } from '../services/api';

const UserDashboard = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState('Idle');
  const [countdown, setCountdown] = useState(null);
  const [recordingTime, setRecordingTime] = useState(30);
  const [isListening, setIsListening] = useState(false);
  const [autoStartAttempted, setAutoStartAttempted] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationLink, setLocationLink] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', relation: '' });
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [cancelTimer, setCancelTimer] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const cancelTimeoutRef = useRef(null);
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);

  const startVoiceRecognition = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Microphone permission error:', err);
      setError('Microphone permission denied. Please allow microphone access in your browser settings, then refresh and try again.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase().trim();
      
      console.log('Voice command detected:', command);
      
      if (command.includes('help me') || 
          command.includes('emergency') || 
          command.includes('save me') ||
          command.includes('help me!') ||
          command.includes('save me!') ||
          command.includes('emergency!')) {
        triggerSOS();
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permission in your browser settings and refresh the page.');
        setStatus('Mic Denied');
        setAutoStartAttempted(true);
        return;
      }
      
      if (event.error !== 'no-speech' && isListening) {
        setTimeout(() => {
          if (isListening) startVoiceRecognition();
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Recognition restart error:', e);
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    setStatus('Listening');
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setStatus('Idle');
  };

  const fetchContacts = async () => {
    try {
      const response = await contactsAPI.getContacts();
      setContacts(response.data.contacts || []);
    } catch (err) {
      console.error('Fetch contacts error:', err);
    }
  };

  const handleContactFormChange = (e) => {
    setContactForm({ ...contactForm, [e.target.name]: e.target.value });
  };

  const resetContactForm = () => {
    setContactForm({ name: '', phone: '', email: '', relation: '' });
    setShowAddContact(false);
    setEditingContact(null);
  };

  const handleAddContact = async () => {
    if (!contactForm.name || !contactForm.phone) {
      setError('Name and phone are required');
      return;
    }
    try {
      await contactsAPI.addContact(contactForm);
      setSuccess('Contact added successfully');
      resetContactForm();
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add contact');
    }
  };

  const handleUpdateContact = async (id) => {
    if (!contactForm.name || !contactForm.phone) {
      setError('Name and phone are required');
      return;
    }
    try {
      await contactsAPI.updateContact(id, contactForm);
      setSuccess('Contact updated successfully');
      resetContactForm();
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update contact');
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await contactsAPI.deleteContact(id);
      setSuccess('Contact deleted');
      fetchContacts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete contact');
    }
  };

  const handleEditClick = (contact) => {
    setContactForm({
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      relation: contact.relation || ''
    });
    setEditingContact(contact.id);
    setShowAddContact(false);
  };

  const startLocationTracking = (caseId) => {
    setActiveCaseId(caseId);
    setIsTracking(true);

    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
    }

    const sendUpdate = async () => {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 10000, maximumAge: 5000
          });
        });
        const { latitude, longitude } = pos.coords;
        const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setLocation({ latitude, longitude });
        setLocationLink(locationLink);
        await sosAPI.updateLocation(caseId, {
          latitude: String(latitude),
          longitude: String(longitude),
          locationLink
        });
      } catch (err) {
        console.error('Location update failed:', err);
      }
    };

    sendUpdate();
    trackingIntervalRef.current = setInterval(sendUpdate, 30000);
  };

  const stopLocationTracking = () => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    setActiveCaseId(null);
    setIsTracking(false);
  };

  useEffect(() => {
    startVoiceRecognition();
    fetchContacts();
    
    const locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setLocation({ latitude, longitude });
        setLocationLink(newLocationLink);
      },
      (err) => {
        console.error('Location watch error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
    
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
      if (cancelTimeoutRef.current) {
        clearInterval(cancelTimeoutRef.current);
      }
      navigator.geolocation.clearWatch(locationWatchId);
    };
  }, []);

  const getLocation = (fresh = false) => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        resolve(null);
        return;
      }

      const options = fresh 
        ? { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        : { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setLocation({ latitude, longitude });
          setLocationLink(newLocationLink);
          console.log('Location captured:', latitude, longitude);
          resolve(newLocationLink);
        },
        (err) => {
          console.error('Location error:', err);
          if (err.code === 1) {
            setError('Location permission denied. Please enable location access.');
          } else if (err.code === 2) {
            setError('Location unavailable. Please try again.');
          } else {
            setError('Unable to retrieve your location');
          }
          resolve(null);
        },
        options
      );
    });
  };

  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.5;
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.frequency.value = 440;
      }, 200);
      
      setTimeout(() => {
        oscillator.frequency.value = 880;
      }, 400);
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 600);
    } catch (err) {
      console.error('Error playing alert sound:', err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      videoStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setStatus('Recording');
      setRecordingTime(30);
      
      mediaRecorder.start(100);

      const recordingDuration = 30000;
      const recordingStartTime = Date.now();

      const timer = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime;
        const remaining = Math.max(0, Math.ceil((recordingDuration - elapsed) / 1000));
        setRecordingTime(remaining);
        if (elapsed >= recordingDuration) {
          clearInterval(timer);
          stopRecording(chunks);
        }
      }, 250);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Unable to access camera/microphone. Please grant permissions.');
    }
  };

  const stopRecording = (chunks) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsRecording(false);
    setStatus('Sending');

    setTimeout(() => {
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      setRecordedVideoBlob(videoBlob);
      setRecordedAudioBlob(audioBlob);
      sendEmergencyData(videoBlob, audioBlob);
    }, 500);
  };

  const sendEmergencyData = async (videoBlob, audioBlob) => {
    try {
      const freshLocationLink = await getLocation(true);
      
      const formData = new FormData();
      
      const videoFile = new File([videoBlob], 'emergency-video.webm', { type: 'video/webm' });
      formData.append('video', videoFile);
      
      const audioFile = new File([audioBlob || videoBlob], 'emergency-audio.webm', { type: 'audio/webm' });
      formData.append('audio', audioFile);
      
      formData.append('locationLink', freshLocationLink || locationLink || '');
      formData.append('latitude', location?.latitude?.toString() || '');
      formData.append('longitude', location?.longitude?.toString() || '');
      
      formData.append('notes', `SOS Alert from ${user?.name} at ${new Date().toLocaleString()}`);

      console.log('Sending SOS data...', {
        videoSize: videoBlob.size,
        audioSize: audioFile.size,
        locationLink: freshLocationLink
      });

      const response = await sosAPI.createCase(formData);
      console.log('SOS sent successfully:', response.data);
      
      playAlertSound();
      setStatus('Sent');
      setShowPreview(true);
      setSuccess('Emergency alert sent successfully! Help is on the way. Your live location is being tracked.');
      
      if (response.data.case?.id) {
        startLocationTracking(response.data.case.id);
      }
      
      setTimeout(() => {
        setStatus('Idle');
        setSuccess('');
      }, 5000);

    } catch (err) {
      console.error('Error sending SOS:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError(`Failed to send emergency alert: ${err.response?.data?.error || err.message || 'Network error'}`);
      setStatus('Idle');
    }
  };

  const startCountdown = () => {
    setStatus('Countdown');
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setCountdown(null);
          getLocation(true).then(() => startRecording());
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOS = () => {
    if (cancelTimeoutRef.current) {
      clearInterval(cancelTimeoutRef.current);
      cancelTimeoutRef.current = null;
    }
    setShowCancel(false);
    setCancelTimer(null);
    setStatus('Idle');
    startVoiceRecognition();
    setSuccess('SOS alert cancelled');
    setTimeout(() => setSuccess(''), 3000);
  };

  const triggerSOS = async () => {
    if (status !== 'Idle' && status !== 'Listening') return;
    
    playAlertSound();
    stopVoiceRecognition();
    setShowCancel(true);
    setCancelTimer(5);

    cancelTimeoutRef.current = setInterval(() => {
      setCancelTimer((prev) => {
        if (prev <= 1) {
          clearInterval(cancelTimeoutRef.current);
          cancelTimeoutRef.current = null;
          setShowCancel(false);
          setCancelTimer(null);
          startCountdown();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartListening = () => {
    if (isListening) {
      stopVoiceRecognition();
      setStatus('Idle');
    } else {
      startVoiceRecognition();
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveVideo = () => {
    if (recordedVideoBlob) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadBlob(recordedVideoBlob, `sos-video-${timestamp}.webm`);
    }
  };

  const handleSaveAudio = () => {
    if (recordedAudioBlob) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadBlob(recordedAudioBlob, `sos-audio-${timestamp}.webm`);
    }
  };

  const handleSaveAll = () => {
    handleSaveVideo();
    setTimeout(() => handleSaveAudio(), 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Emergency Dashboard</h1>
          <p className="text-gray-300">Welcome, {user?.name}</p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-6 animate-shake">
            <button 
              onClick={() => setError('')}
              className="float-right text-red-400 hover:text-red-200"
            >
              ✕
            </button>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 text-green-200 px-6 py-4 rounded-lg mb-6 animate-bounce-in">
            <button 
              onClick={() => setSuccess('')}
              className="float-right text-green-400 hover:text-green-200"
            >
              ✕
            </button>
            {success}
          </div>
        )}

        <div className="bg-gray-800 rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Status</h2>
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              status === 'Idle' ? 'bg-gray-700 text-gray-300' :
              status === 'Listening' ? 'bg-blue-600 text-white status-pulse' :
              status === 'Countdown' ? 'bg-yellow-600 text-white' :
              status === 'Recording' ? 'bg-red-600 text-white animate-pulse' :
              status === 'Sending' ? 'bg-orange-600 text-white' :
              'bg-green-600 text-white'
            }`}>
              {status}
            </div>
          </div>

          {showCancel && (
            <div className="text-center py-8">
              <div className="text-6xl font-bold text-yellow-400 mb-4 animate-pulse">
                {cancelTimer}
              </div>
              <p className="text-xl text-white mb-6">SOS will be sent in {cancelTimer} seconds</p>
              <button
                onClick={cancelSOS}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold text-xl px-12 py-4 rounded-2xl border-2 border-red-500 transition-all hover:scale-105"
              >
                ✕ CANCEL SOS
              </button>
            </div>
          )}

          {countdown !== null && !showCancel && (
            <div className="text-center py-12">
              <div className="countdown-number animate-bounce">
                {countdown}
              </div>
              <p className="text-2xl text-white mt-4">Get Ready!</p>
            </div>
          )}

          {status === 'Recording' && countdown === null && (
            <div className="text-center py-12">
              <div className="recording-indicator justify-center mb-4">
                <span className="text-red-500 text-xl font-bold">RECORDING</span>
              </div>
              <div className="text-6xl font-bold text-white mb-4">
                {recordingTime}s
              </div>
              <video 
                ref={videoRef} 
                className="hidden"
                autoPlay 
                muted 
                playsInline
              />
              <p className="text-gray-400">Recording your emergency situation...</p>
            </div>
          )}

          {(status === 'Idle' || status === 'Listening') && countdown === null && (
            <div className="text-center py-8">
              <video 
                ref={videoRef} 
                className="hidden"
                autoPlay 
                muted 
                playsInline
              />
            </div>
          )}

          {status === 'Sending' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500 mx-auto mb-4"></div>
              <p className="text-xl text-white">Sending emergency alert...</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2 text-green-400 bg-green-900/30 py-3 rounded-xl mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Voice Protection Active - Listening for "Help Me", "Emergency", or "Save Me"</span>
          </div>

          {isTracking && (
            <div className="flex items-center justify-center space-x-2 text-blue-400 bg-blue-900/30 py-3 rounded-xl mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Live Location Tracking Active - Updating every 30 seconds</span>
              <button onClick={stopLocationTracking} className="text-blue-300 hover:text-blue-100 text-sm underline ml-2">Stop</button>
            </div>
          )}

          <button
            onClick={triggerSOS}
            disabled={false}
            className="sos-button bg-gradient-to-br from-red-600 via-red-500 to-pink-600 
              hover:from-red-700 hover:via-red-600 hover:to-pink-700 
              text-white font-bold text-2xl py-12 px-8 rounded-2xl 
              shadow-2xl transform transition-all w-full hover:scale-105 animate-glow"
          >
            <div className="flex flex-col items-center space-y-4">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>SEND SOS ALERT</span>
            </div>
          </button>
        </div>

        {locationLink && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Location</h3>
            <div className="flex items-center space-x-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <a 
                href={locationLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Open in Google Maps
              </a>
            </div>
            {location && (
              <p className="text-gray-400 text-sm mt-2">
                Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Emergency Contacts
            </h3>
            <button
              onClick={() => { setShowAddContact(true); setEditingContact(null); setContactForm({ name: '', phone: '', email: '', relation: '' }); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Contact</span>
            </button>
          </div>

          {showAddContact && (
            <div className="bg-gray-900 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input type="text" name="name" value={contactForm.name} onChange={handleContactFormChange} placeholder="Full Name *" className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="tel" name="phone" value={contactForm.phone} onChange={handleContactFormChange} placeholder="Phone Number *" className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="email" name="email" value={contactForm.email} onChange={handleContactFormChange} placeholder="Email (for SOS alerts)" className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <select name="relation" value={contactForm.relation} onChange={handleContactFormChange} className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select Relation</option>
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button onClick={handleAddContact} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Save Contact</button>
                <button onClick={resetContactForm} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {contacts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No emergency contacts added yet.</p>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="bg-gray-900 rounded-xl p-4">
                  {editingContact === contact.id ? (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input type="text" name="name" value={contactForm.name} onChange={handleContactFormChange} placeholder="Full Name" className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" />
                        <input type="tel" name="phone" value={contactForm.phone} onChange={handleContactFormChange} placeholder="Phone" className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" />
                        <input type="email" name="email" value={contactForm.email} onChange={handleContactFormChange} placeholder="Email" className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" />
                        <select name="relation" value={contactForm.relation} onChange={handleContactFormChange} className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                          <option value="">Relation</option>
                          <option value="Parent">Parent</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Friend">Friend</option>
                          <option value="Colleague">Colleague</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleUpdateContact(contact.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Save</button>
                        <button onClick={resetContactForm} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {contact.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-white font-medium">{contact.name}</p>
                            {contact.relation && (
                              <span className="bg-blue-900 text-blue-300 text-xs px-2 py-0.5 rounded-full">{contact.relation}</span>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">{contact.phone}</p>
                          {contact.email && <p className="text-gray-500 text-xs">{contact.email}</p>}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleEditClick(contact)} className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-2 rounded-lg transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteContact(contact.id)} className="bg-red-900 hover:bg-red-800 text-red-300 p-2 rounded-lg transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-gray-600 text-xs mt-3">Your emergency contacts will be notified via email when you trigger an SOS alert.</p>
        </div>

        <div className="mt-8 bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">1</span>
              </div>
              <p className="text-gray-300 text-sm">Voice recognition is always active in background</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">2</span>
              </div>
              <p className="text-gray-300 text-sm">Say "Help Me", "Emergency", or "Save Me"</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">3</span>
              </div>
              <p className="text-gray-300 text-sm">30-second recording will be sent to police</p>
            </div>
          </div>
        </div>

        {showPreview && (recordedVideoBlob || recordedAudioBlob) && (
          <div className="mt-6 bg-gray-800 rounded-xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Your Recorded Files
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            {recordedVideoBlob && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Video Recording</label>
                <div className="bg-gray-900 rounded-lg p-4">
                  <video 
                    ref={previewVideoRef}
                    src={URL.createObjectURL(recordedVideoBlob)}
                    controls
                    className="w-full max-h-64 rounded-lg"
                  />
                  <button
                    onClick={handleSaveVideo}
                    className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Video</span>
                  </button>
                </div>
              </div>
            )}

            {recordedAudioBlob && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Audio Recording</label>
                <div className="bg-gray-900 rounded-lg p-4">
                  <audio 
                    src={URL.createObjectURL(recordedAudioBlob)}
                    controls
                    className="w-full"
                  />
                  <button
                    onClick={handleSaveAudio}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Audio</span>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveAll}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download All Files</span>
            </button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Your recordings are automatically saved to this device. They are also sent to the police dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
