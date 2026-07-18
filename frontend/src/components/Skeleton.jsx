export default function Skeleton({ className = '', rows = 1, type = 'line' }) {
  const widths = ['92%', '78%', '86%', '64%', '74%', '88%', '58%', '81%'];

  if (type === 'card') {
    return (
      <div className={`rounded-2xl border border-border/60 bg-surface p-6 ${className}`}>
        <div className="h-3 w-1/3 skeleton-shimmer rounded mb-4" />
        <div className="h-8 w-1/2 skeleton-shimmer rounded mb-3" />
        <div className="h-3 w-2/3 skeleton-shimmer rounded" />
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-4 rounded skeleton-shimmer"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}
