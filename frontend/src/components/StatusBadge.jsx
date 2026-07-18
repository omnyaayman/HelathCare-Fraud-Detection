export default function StatusBadge({ status, size = 'default' }) {
  const styles = {
    Pending: 'border-warning/25 bg-warning/10 text-warning',
    Processing: 'border-primary/25 bg-primary/10 text-primary',
    Flagged: 'border-accent/25 bg-accent/10 text-accent',
    Cleared: 'border-success/25 bg-success/10 text-success',
    Active: 'border-success/25 bg-success/10 text-success',
    Expired: 'border-danger/25 bg-danger/10 text-danger',
    'Fraud Confirmed': 'border-danger/25 bg-danger/10 text-danger',
    Real: 'border-success/25 bg-success/10 text-success',
    Fraud: 'border-danger/25 bg-danger/10 text-danger',
    Approved: 'border-success/25 bg-success/10 text-success',
    Rejected: 'border-danger/25 bg-danger/10 text-danger',
    Submitted: 'border-primary/25 bg-primary/10 text-primary',
    'Under Review': 'border-warning/25 bg-warning/10 text-warning',
    'AI Scored': 'border-accent/25 bg-accent/10 text-accent',
    Investigated: 'border-orange-500/25 bg-orange-500/10 text-orange-500',
    Closed: 'border-slate-500/25 bg-slate-500/10 text-slate-500',
  };

  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-[8px]' 
    : 'px-2.5 py-1 text-[10px]';

  const resolvedStyle = styles[status] || 'border-border bg-bg/70 text-textSecondary';

  return (
    <span className={`inline-flex items-center rounded-full border font-black uppercase tracking-wide ${sizeClasses} ${resolvedStyle}`}>
      {status || 'Unknown'}
    </span>
  );
}
