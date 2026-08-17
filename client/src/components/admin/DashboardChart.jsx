import { useState } from 'react';

const formatFullDate = (day) => {
  const d = new Date(day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDay = (day) => {
  const d = new Date(day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function ChartTooltip({ x, y, date, count, label }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap"
      style={{ left: x, top: y }}
      role="tooltip"
    >
      <div className="font-semibold">{date}</div>
      <div className="text-gray-300 mt-0.5">
        {label}: <span className="text-white font-bold">{count}</span>
      </div>
    </div>
  );
}

export default function DashboardChart({ title, series = [], color = 'bg-purple-500', label = 'Count' }) {
  const [hovered, setHovered] = useState(null);

  const counts = series.map((s) => Number(s.count) || 0);
  const max = Math.max(...counts, 1);

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-6">{title}</h3>
      <div className="relative">
        <div className="flex items-end gap-1 h-48">
          {series.map((s, i) => {
            const count = Number(s.count) || 0;
            const height = Math.max((count / max) * 100, count > 0 ? 3 : 1);
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end h-full min-w-0 relative"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHovered({
                    index: i,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
                onMouseLeave={() => setHovered((h) => (h && h.index === i ? null : h))}
                onFocus={() => setHovered({ index: i, x: 60, y: 40 })}
                onBlur={() => setHovered((h) => (h && h.index === i ? null : h))}
              >
                <button
                  tabIndex={0}
                  aria-label={`${formatFullDate(s.day)}: ${count}`}
                  onClick={(e) => {
                    const rect = e.currentTarget.parentElement.getBoundingClientRect();
                    setHovered({
                      index: i,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  className={`w-full max-w-8 rounded-t ${color} transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 hover:opacity-80`}
                  style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '2px' }}
                />
              </div>
            );
          })}
        </div>
        {hovered && series[hovered.index] && (
          <ChartTooltip
            x={hovered.x}
            y={hovered.y}
            date={formatFullDate(series[hovered.index].day)}
            count={series[hovered.index].count}
            label={label}
          />
        )}
      </div>
      <div className="mt-2 flex gap-1">
        {series.map((s, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-gray-500 truncate">
            {formatDay(s.day)}
          </div>
        ))}
      </div>
    </div>
  );
}