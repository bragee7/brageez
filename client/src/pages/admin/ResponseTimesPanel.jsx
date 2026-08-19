import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import DetailDrawer from '../../components/admin/DetailDrawer';
import LoadingState from '../../components/admin/LoadingState';
import ErrorState from '../../components/admin/ErrorState';
import RefreshButton from '../../components/admin/RefreshButton';

const formatMinutes = (m) => (m == null ? '—' : `${Number(m).toFixed(1)} min`);

const ResponseTimesPanel = ({ onClose, title }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getResponseTimes();
      setData(res.data);
      setLoading(false);
    } catch (e) {
      setError('Failed to load response time stats');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overall = data?.overall || {};
  const perOfficer = data?.perOfficer || [];

  return (
    <DetailDrawer
      title={title || 'Response Times'}
      subtitle={overall.respondedCount != null ? `${overall.respondedCount} cases responded` : undefined}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <RefreshButton onClick={load} />
        </div>

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <LoadingState label="Loading response times..." />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="text-gray-400 text-sm">Avg Response Time</div>
                <div className="text-2xl font-bold text-white mt-1">{formatMinutes(overall.avgMinutes)}</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="text-gray-400 text-sm">Max Response Time</div>
                <div className="text-2xl font-bold text-white mt-1">{formatMinutes(overall.maxMinutes)}</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="text-gray-400 text-sm">Cases Responded</div>
                <div className="text-2xl font-bold text-white mt-1">{overall.respondedCount ?? 0}</div>
              </div>
            </div>

            {perOfficer.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No officer response data yet</div>
            ) : (
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-gray-400">
                      <th className="px-6 py-3">Officer</th>
                      <th className="px-6 py-3">Cases</th>
                      <th className="px-6 py-3">Avg Response</th>
                      <th className="px-6 py-3">Max Response</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {perOfficer.map((o, i) => (
                      <tr key={o.officer || i} className="text-gray-300">
                        <td className="px-6 py-3 text-white">{o.officer}</td>
                        <td className="px-6 py-3">{o.cases}</td>
                        <td className="px-6 py-3">{formatMinutes(o.avgMinutes)}</td>
                        <td className="px-6 py-3">{formatMinutes(o.maxMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DetailDrawer>
  );
};

export default ResponseTimesPanel;