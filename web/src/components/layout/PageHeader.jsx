export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {title && <h1 className="text-2xl font-bold text-slate-900">{title}</h1>}
        {subtitle && (
          <p className={`text-sm text-slate-600 ${title ? 'mt-1' : ''}`}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
