export default function Loader({ label = 'Processing', className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span
        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"
        aria-hidden="true"
      />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
