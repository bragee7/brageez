import React from 'react';
import CasesPanel from './CasesPanel';
import { humanizeDuration, shortId, formatDate, truncate } from '../../utils/format';

const ResolvedPanel = ({ onClose, title }) => {
  const columns = [
    { key: 'id', label: 'Case ID', render: (r) => <span className="font-mono text-xs text-gray-400">{shortId(r.id)}</span> },
    { key: 'userEmail', label: 'User', render: (r) => <span className="text-white font-medium">{r.userEmail || '—'}</span> },
    { key: 'createdAt', label: 'Created Date', render: (r) => <span className="text-gray-300">{formatDate(r.createdAt)}</span> },
    { key: 'resolvedAt', label: 'Resolved Date', render: (r) => <span className="text-gray-300">{formatDate(r.resolvedAt)}</span> },
    { key: 'resolutionTime', label: 'Resolution Time', render: (r) => <span className="text-gray-300">{humanizeDuration(r.resolutionTime)}</span> },
    { key: 'assignedOfficer', label: 'Assigned Officer', render: (r) => <span className="text-gray-300">{r.assignedOfficer || '—'}</span> },
    { key: 'caseType', label: 'Case Type', render: (r) => <span className="text-gray-300">{r.caseType || '—'}</span> },
    {
      key: 'locationLink', label: 'Location', render: (r) =>
        r.locationLink
          ? <a href={r.locationLink} target="_blank" rel="noreferrer" className="text-purple-400 underline hover:text-purple-300">View</a>
          : <span className="text-gray-500">—</span>
    },
    { key: 'status', label: 'Status', render: (r) => <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400">Resolved</span> },
    { key: 'notes', label: 'Resolution Notes', render: (r) => <span className="text-gray-300">{truncate(r.notes)}</span> },
  ];

  return (
    <CasesPanel
      onClose={onClose}
      title={title || 'Resolved Cases'}
      fixedStatus="Resolved"
      columns={columns}
    />
  );
};

export default ResolvedPanel;