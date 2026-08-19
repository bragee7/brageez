import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sosAPI } from '../services/api';

const FloatingSosButton = () => {
  const { user, isAuthenticated } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isAuthenticated || user?.role !== 'user') return null;

  const getPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
    });

  const sendSos = async () => {
    if (sending || sent) return;
    if (!window.confirm('Send an emergency SOS with your current location?')) return;

    setSending(true);
    try {
      const pos = await getPosition();
      const formData = new FormData();
      formData.append('description', 'Emergency SOS from web');
      formData.append('latitude', String(pos.coords.latitude));
      formData.append('longitude', String(pos.coords.longitude));
      await sosAPI.createCase(formData);
      setSent(true);
      window.alert('SOS sent! Your location has been shared with police.');
    } catch (e) {
      window.alert(e?.message || 'Failed to send SOS. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={sendSos}
      aria-label="Send SOS"
      disabled={sending || sent}
      className={`fixed bottom-6 right-6 z-[1000] h-16 w-16 rounded-full text-white font-bold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300/50 ${
        sent ? 'bg-green-600' : 'bg-red-600'
      } disabled:opacity-70`}
    >
      {sent ? '✓' : sending ? '…' : 'SOS'}
    </button>
  );
};

export default FloatingSosButton;