const FilterBar = ({ filters, values, onChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {filters.map((f) => {
        const current = values?.[f.key] ?? '';
        return (
          <select
            key={f.key}
            value={current}
            onChange={(e) => onChange(f.key, e.target.value)}
            aria-label={`Filter by ${f.label}`}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">{f.label}</option>
            {f.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      })}
    </div>
  );
};

export default FilterBar;