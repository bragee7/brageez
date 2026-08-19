import { useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FIELD_CLS =
  'w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500';
const LABEL_CLS = 'block text-sm font-medium text-gray-300 mb-1';
const BTN_PRIMARY =
  'px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SECONDARY =
  'px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const Profile = () => {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const showMsg = (m) => {
    setMsg(m);
    setErr('');
  };
  const showErr = (e) => {
    setErr(e);
    setMsg('');
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      await authAPI.updateMe({ name: name.trim() });
      showMsg('Profile updated successfully');
    } catch (err) {
      showErr(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');
    if (newPassword.length < 6) {
      showErr('New password must be at least 6 characters');
      setBusy(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      showErr('New passwords do not match');
      setBusy(false);
      return;
    }
    try {
      await authAPI.updateMe({ currentPassword, password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showMsg('Password changed successfully');
    } catch (err) {
      showErr(err.response?.data?.error || 'Failed to change password');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadData = async () => {
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const res = await authAPI.exportMe();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zelda-my-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMsg('Your data export has been downloaded');
    } catch (err) {
      showErr(err.response?.data?.error || 'Failed to export your data');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-1">Profile Settings</h1>
        <p className="text-gray-400 text-sm mb-6">
          Manage your account details and data.
        </p>

        {msg && (
          <div className="mb-4 p-3 rounded-lg bg-green-900/50 border border-green-700 text-green-200 text-sm">
            {msg}
          </div>
        )}
        {err && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-200 text-sm">
            {err}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Name</label>
                <input
                  className={FIELD_CLS}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Guardian ID (email)</label>
                <input
                  className={`${FIELD_CLS} opacity-60 cursor-not-allowed`}
                  value={user?.email || ''}
                  disabled
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Role</label>
                <input
                  className={`${FIELD_CLS} opacity-60 cursor-not-allowed`}
                  value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                  disabled
                />
              </div>
              <button
                type="submit"
                disabled={busy || !name.trim() || name.trim() === (user?.name || '')}
                className={BTN_PRIMARY}
              >
                Save Name
              </button>
            </form>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Current Password</label>
                <input
                  type="password"
                  className={FIELD_CLS}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>New Password</label>
                <input
                  type="password"
                  className={FIELD_CLS}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Confirm New Password</label>
                <input
                  type="password"
                  className={FIELD_CLS}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !currentPassword || newPassword.length < 6}
                className={BTN_SECONDARY}
              >
                Change Password
              </button>
            </form>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Your Data</h2>
            <p className="text-gray-400 text-sm mb-4">
              Download a copy of all data stored for your account (GDPR data export).
            </p>
            <button
              type="button"
              onClick={handleDownloadData}
              disabled={busy}
              className={BTN_PRIMARY}
            >
              Download My Data
            </button>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Voice Protection Phrases</h2>
            <p className="text-gray-400 text-sm">
              Voice phrases management is available in the ZELDA mobile app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;