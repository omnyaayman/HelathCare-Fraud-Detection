export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-lg shadow-primary/10">
        <div className="h-7 w-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
      <div className="text-sm font-bold text-textPrimary">Loading healthcare workspace</div>
      <div className="mt-1 text-xs text-textSecondary">Preparing secure analytics...</div>
    </div>
  );
}
