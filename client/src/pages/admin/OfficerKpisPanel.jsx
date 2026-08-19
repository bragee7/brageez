import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import DetailDrawer from '../../components/admin/DetailDrawer';
import LoadingState from '../../components/admin/LoadingState';
import ErrorState from '../../components/admin/ErrorState';
import RefreshButton from '../../components/admin/RefreshButton';

const formatMinutes = (m) => {
  if (m === null || m === undefined) return '—';
  return `${Number(m).toFixed(1)} min`;
};

const OfficerKpisPanel = ({ onClose, title }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await adminAPI.getOfficerKpis();
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load officer KPIs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const officers = data?.officers || [];

  return (
    <DetailDrawer title={title || 'Officer KPIs'} subtitle={`${officers.length} officers`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm">Response performance per officer</p>
          <RefreshButton onClick={load} loading={loading} label="Refresh" />
        </div>
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <LoadingState label="Loading officer KPIs..." />
        ) : officers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No officer KPI data yet</div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="py-3 px-4">Officer</th>
                  <th className="py-3 px-4">Cases Handled</th>
                  <th className="py-3 px-4">Resolved</th>
                  <th className="py-3 px-4">Pending</th>
                  <th className="py-3 px-4">Avg Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {officers.map((o, i) => (
                  <tr key={o.officer || i}>
                    <td className="py-3 px-4 text-white font-medium">{o.officer}</td>
                    <td className="py-3 px-4 text-gray-300">{o.casesHandled ?? 0}</td>
                    <td className="py-3 px-4 text-green-400">{o.resolvedCount ?? 0}</td>
                    <td className="py-3 px-4 text-yellow-400">{o.pendingCount ?? 0}</td>
                    <td className="py-3 px-4 text-gray-300">{formatMinutes(o.avgResponseMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DetailDrawer>
  );
};

export default OfficerKpisPanel;