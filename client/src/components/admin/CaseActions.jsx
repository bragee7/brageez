import { useState } from 'react';
import { adminAPI } from '../../services/api';

const PRIORITIES = ['High', 'Medium', 'Low'];
const CLOSURE_REASONS = [
  'False Alarm',
  'Victim Safe',
  'Police Intervention',
  'Emergency Resolved',
  'Duplicate Case',
  'Other',
];

const CaseActions = ({ row, onChanged }) => {
  const [officer, setOfficer] = useState(row.assignedOfficer || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [showClosure, setShowClosure] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const save = async (patch) => {
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      await adminAPI.updateCase(row.id, patch);
      setMsg('Saved');
      if (onChanged) setTimeout(onChanged, 400);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const assignOfficer = () => {
    if (!officer.trim()) return;
    save({ assignedOfficer: officer.trim() });
  };

  const toggleStatus = () => {
    if (row.status === 'Resolved') {
      save({ status: 'Pending' });
      return;
    }
    setShowClosure(true);
  };

  const confirmResolve = () => {
    const reason =
      closureReason === 'Other' && customReason.trim()
        ? customReason.trim()
        : closureReason;
    if (!reason) {
      setErr('A closure reason is required to resolve the case');
      return;
    }
    setShowClosure(false);
    setClosureReason('');
    setCustomReason('');
    save({ status: 'Resolved', closureReason: reason });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={row.priority || ''}
        onChange={(e) => e.target.value && save({ priority: e.target.value })}
        disabled={busy}
        className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
        aria-label={`Priority for case ${row.id}`}
      >
        <option value="">Priority</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <input
        value={officer}
        onChange={(e) => setOfficer(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') assignOfficer(); }}
        placeholder="Officer name"
        className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-200 w-24 focus:outline-none focus:border-purple-500"
        aria-label={`Assigned officer for case ${row.id}`}
      />
      <button
        onClick={assignOfficer}
        disabled={busy || !officer.trim()}
        className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-40"
      >
        Assign
      </button>

      <button
        onClick={toggleStatus}
        disabled={busy}
        className={`text-xs px-2 py-1 rounded font-medium ${
          row.status === 'Resolved'
            ? 'bg-yellow-900/50 text-yellow-400 hover:bg-yellow-900/70'
            : 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
        }`}
      >
        {row.status === 'Resolved' ? 'Reopen' : 'Resolve'}
      </button>

      {msg && <span className="text-xs text-green-400">{msg}</span>}
      {err && <span className="text-xs text-red-400">{err}</span>}

      {showClosure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowClosure(false)}>
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl p-5 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-white font-semibold mb-1">Resolve Case</h4>
            <p className="text-gray-400 text-sm mb-3">Select a closure reason</p>
            <select
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-purple-500"
            >
              <option value="">Select reason…</option>
              {CLOSURE_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {closureReason === 'Other' && (
              <input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the reason"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-purple-500"
              />
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={confirmResolve}
                disabled={busy}
                className="flex-1 text-sm px-3 py-2 rounded-lg bg-green-900/50 text-green-400 hover:bg-green-900/70 disabled:opacity-40"
              >
                Confirm Resolve
              </button>
              <button
                onClick={() => setShowClosure(false)}
                disabled={busy}
                className="flex-1 text-sm px-3 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseActions;
