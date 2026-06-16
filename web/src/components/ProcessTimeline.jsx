export default function ProcessTimeline({ items, variant = 'light' }) {
  const isDark = variant === 'dark';

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              item.done
                ? 'bg-emerald-500 text-white'
                : item.current
                  ? 'bg-indigo-600 text-white'
                  : isDark
                    ? 'border border-slate-600 bg-slate-800 text-slate-500'
                    : 'border border-slate-300 bg-white text-slate-400'
            }`}
          >
            {item.done ? '✓' : item.current ? '•' : ''}
          </span>
          <div className="min-w-0">
            <p
              className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              {item.label}
            </p>
            {item.detail && (
              <p className={`mt-0.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {item.detail}
              </p>
            )}
            {item.pending && (
              <p className="mt-0.5 text-xs text-amber-600">Pending reviewer decision</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
