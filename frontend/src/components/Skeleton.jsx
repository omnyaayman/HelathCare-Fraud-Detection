export default function Skeleton({ className = '', rows = 1 }) {
  const widths = ['92%', '78%', '86%', '64%', '74%', '88%', '58%', '81%'];

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-gradient-to-r from-border/60 via-surface to-border/50 animate-pulse"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}
