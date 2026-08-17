import React from 'react';
import CasesPanel from './CasesPanel';
import { humanizeDuration, shortId, formatDateTime, truncate } from '../../utils/format';

const PendingPanel = ({ onClose, title }) => {
  const columns = [
    { key: 'id', label: 'Case ID', render: (r) => <span className="font-mono text-xs text-gray-400">{shortId(r.id)}</span> },
    { key: 'userEmail', label: 'User', render: (r) => <span className="text-white font-medium">{r.userEmail || '—'}</span> },
    { key: 'userEmail', label: 'Email', render: (r) => <span className="text-gray-300">{r.userEmail || '—'}</span> },
    { key: 'createdAt', label: 'Created', render: (r) => <span className="text-gray-300">{formatDateTime(r.createdAt)}</span> },
    {
      key: 'locationLink', label: 'Location', render: (r) =>
        r.locationLink
          ? <a href={r.locationLink} target="_blank" rel="noreferrer" className="text-purple-400 underline hover:text-purple-300">View</a>
          : <span className="text-gray-500">—</span>
    },
    { key: 'caseType', label: 'Case Type', render: (r) => <span className="text-gray-300">{r.caseType || '—'}</span> },
    {
      key: 'priority', label: 'Priority', render: (r) => {
        const map = { High: 'bg-red-900/50 text-red-400', Medium: 'bg-yellow-900/50 text-yellow-400', Low: 'bg-green-900/50 text-green-400' };
        return r.priority
          ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[r.priority] || 'bg-gray-700 text-gray-300'}`}>{r.priority}</span>
          : <span className="text-gray-500">—</span>;
      }
    },
    { key: 'assignedOfficer', label: 'Assigned Officer', render: (r) => <span className="text-gray-300">{r.assignedOfficer || '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400">Pending</span> },
    { key: 'waitingDuration', label: 'Waiting Duration', render: (r) => <span className="text-gray-300">{humanizeDuration(r.waitingDuration)}</span> },
  ];

  return (
    <CasesPanel
      onClose={onClose}
      title={title || 'Pending Cases'}
      fixedStatus="Pending"
      columns={columns}
    />
  );
};

export default PendingPanel;