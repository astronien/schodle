// Full-screen loading / error states used by the app shell.

export function FullScreenLoader({ message }: { message: string }) {
  return (
    <div
      className="min-h-screen w-full bg-bg-primary flex items-center justify-center text-text-secondary font-sans"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-tertiary">{message}</p>
      </div>
    </div>
  );
}

export function FullScreenError({
  title,
  detail,
  retryLabel,
  onRetry,
}: {
  title: string;
  detail?: string | null;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen w-full bg-bg-primary flex items-center justify-center text-text-secondary font-sans">
      <div className="text-center space-y-3">
        <p className="text-danger font-medium">{title}</p>
        {detail && <p className="text-sm text-text-tertiary">{detail}</p>}
        <button onClick={onRetry} className="btn btn-primary text-sm">
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
