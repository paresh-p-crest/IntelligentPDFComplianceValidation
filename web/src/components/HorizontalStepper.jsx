export default function HorizontalStepper({ items = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-slate-300">›</span>}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              item.done
                ? 'bg-emerald-50 text-emerald-700'
                : item.current
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                  : 'bg-slate-100 text-slate-500'
            }`}
            title={item.detail}
          >
            <span className="text-[10px]">{item.done ? '✓' : item.current ? '●' : '○'}</span>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
