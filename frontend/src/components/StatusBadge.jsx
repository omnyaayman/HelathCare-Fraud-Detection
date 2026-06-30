export default function StatusBadge({ status }) {
  const styles = {
    Pending: 'bg-warning/15 text-warning',
    Processing: 'bg-primary/15 text-primary',
    Flagged: 'bg-accent/15 text-accent',
    Cleared: 'bg-success/15 text-success',
    'Fraud Confirmed': 'bg-danger/15 text-danger',
    Real: 'bg-success/15 text-success',
    Fraud: 'bg-danger/15 text-danger',
  };

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${styles[status] || 'bg-border/30 text-textSecondary'}`}>
      {status}
    </span>
  );
}
