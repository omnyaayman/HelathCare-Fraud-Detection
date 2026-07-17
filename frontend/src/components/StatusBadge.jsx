export default function StatusBadge({ status }) {
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
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${styles[status] || 'border-border bg-bg/70 text-textSecondary'}`}>
      {status || 'Unknown'}
    </span>
  );
}
