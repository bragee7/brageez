import { useState } from 'react';
import { adminAPI } from '../../services/api';

const ContactActions = ({ row, onChanged, onEdit }) => {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const doDelete = async () => {
    setBusy(true);
    setErr('');
    try {
      await adminAPI.deleteContact(row.id);
      if (onChanged) onChanged();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Delete failed');
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {confirming ? (
        <>
          <span className="text-xs text-red-400">Delete {row.name}?</span>
          <button
            onClick={doDelete}
            disabled={busy}
            className="text-xs px-2 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200 disabled:opacity-40"
          >
            Confirm
          </button>
          <button
            onClick={() => { setConfirming(false); setErr(''); }}
            disabled={busy}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-40"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onEdit && onEdit(row)}
            disabled={busy}
            className="text-xs px-2 py-1 rounded bg-blue-900/40 hover:bg-blue-900/70 text-blue-400 disabled:opacity-40"
            aria-label={`Edit contact ${row.name}`}
          >
            Edit
          </button>
          <button
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="text-xs px-2 py-1 rounded bg-red-900/40 hover:bg-red-900/70 text-red-400 disabled:opacity-40"
            aria-label={`Delete contact ${row.name}`}
          >
            Delete
          </button>
        </>
      )}
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
};

export default ContactActions;