export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg">
      <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin mb-4" />
      <div className="text-sm text-textSecondary">Loading...</div>
    </div>
  );
}
