export default function LoadingState({ label = 'Loading...', rows = 5 }) {
  return (
    <div className="py-6">
      <p className="text-sm text-gray-400 mb-4">{label}</p>
      <div className="space-y-3" role="status" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
