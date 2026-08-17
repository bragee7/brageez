export default function EmptyState({ icon = '📭', title = 'No records found', message = '' }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-gray-300 font-medium">{title}</p>
      {message && <p className="text-gray-500 text-sm mt-1">{message}</p>}
    </div>
  );
}