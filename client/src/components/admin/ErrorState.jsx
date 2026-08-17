export default function ErrorState({ message = 'Something went wrong while loading data.', onRetry }) {
  return (
    <div className="bg-red-900/40 border border-red-700 rounded-lg px-6 py-6 my-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <p className="text-red-200 font-medium">Failed to load data</p>
          <p className="text-red-300/80 text-sm mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}