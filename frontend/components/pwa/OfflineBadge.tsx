'use client';

/**
 * Badge to indicate offline/cached data
 * Requirements: 21.12
 */
export function OfflineBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 ${className}`}
      role="status"
      aria-label="Viewing cached data"
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Cached</span>
    </div>
  );
}
