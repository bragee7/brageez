import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import DetailDrawer from '../../components/admin/DetailDrawer';
import DataTable from '../../components/admin/DataTable';
import SearchBar from '../../components/admin/SearchBar';
import LoadingState from '../../components/admin/LoadingState';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import RefreshButton from '../../components/admin/RefreshButton';
import Pagination from '../../components/admin/Pagination';
import { shortId, formatDate } from '../../utils/format';

const ContactsPanel = ({ onClose, title }) => {
  const [data, setData] = useState({ total: 0, contacts: [] });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getContacts({ page, size: 20, search: search || undefined });
      setData({ total: res.data.total, contacts: res.data.contacts });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'id', label: 'Contact ID', render: (r) => <span className="font-mono text-xs text-gray-400">{shortId(r.id)}</span> },
    {
      key: 'user', label: 'User', render: (r) =>
        <span className="text-white font-medium">{r.userName || r.userEmail || '—'}</span>
    },
    { key: 'name', label: 'Contact Name', render: (r) => <span className="text-gray-300">{r.name || '—'}</span> },
    { key: 'phone', label: 'Phone', render: (r) => <span className="text-gray-300">{r.phone || '—'}</span> },
    { key: 'relation', label: 'Relationship', render: (r) => <span className="text-gray-300">{r.relation || '—'}</span> },
    { key: 'email', label: 'Email', render: (r) => <span className="text-gray-300">{r.email || '—'}</span> },
    { key: 'createdAt', label: 'Created Date', render: (r) => <span className="text-gray-300">{formatDate(r.createdAt)}</span> },
    { key: 'status', label: 'Status', render: () => <span className="text-gray-500">—</span> },
  ];

  return (
    <DetailDrawer
      title={title || 'Emergency Contacts'}
      subtitle="All registered emergency contacts"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar placeholder="Search contacts..." onSearch={setSearch} />
          <RefreshButton onClick={load} loading={loading} />
        </div>

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <LoadingState label="Loading contacts..." />
        ) : data.contacts.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No Contacts Found"
            message="There are currently no emergency contacts registered."
          />
        ) : (
          <>
            <DataTable columns={columns} rows={data.contacts} rowKey={(r) => r.id} />
            <Pagination total={data.total} page={page} size={20} onPageChange={setPage} />
          </>
        )}
      </div>
    </DetailDrawer>
  );
};

export default ContactsPanel;