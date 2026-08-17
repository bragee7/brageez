import { useState } from 'react';
import { adminAPI } from '../../services/api';

const PRIORITIES = ['High', 'Medium', 'Low'];

const CaseActions = ({ row, onChanged }) => {
  const [officer, setOfficer] = useState(row.assignedOfficer || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

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
    save({ status: row.status === 'Resolved' ? 'Pending' : 'Resolved' });
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
    </div>
  );
};

export default CaseActions;
