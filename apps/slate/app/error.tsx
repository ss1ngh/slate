'use client';

/**
 * error.tsx — Next.js error boundary for any route segment.
 * Must be a Client Component. Catches runtime errors in the
 * subtree and renders a recovery UI without crashing the whole app.
 */
import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log to an error-reporting service in production
        console.error('[Slate] Unhandled error:', error);
    }, [error]);

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-4 text-center px-6 max-w-sm">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                    {error.message || 'An unexpected error occurred. Your canvas data is safe in local storage.'}
                </p>
                <button
                    onClick={reset}
                    className="mt-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
