export default function Skeleton({ className = '', rows = 1 }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-4 bg-border/40 rounded animate-pulse"
          style={{ width: `${60 + Math.random() * 40}%` }}
        />
      ))}
    </div>
  );
}
