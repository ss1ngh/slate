/**
 * Root loading.tsx — shown by Next.js via React Suspense while the
 * dynamic Canvas chunk is being fetched on first load.
 *
 * This is a Server Component; it renders instantly on the server so the
 * user sees a shell immediately instead of a blank white screen.
 */
export default function Loading() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-4">
                {/* Animated brand mark */}
                <svg
                    width="48"
                    height="48"
                    viewBox="0 0 50 50"
                    fill="none"
                    className="animate-pulse"
                >
                    <rect width="50" height="50" rx="16" fill="#4f46e5" />
                    <g transform="translate(12, 12) scale(1.1)">
                        <path
                            d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </g>
                </svg>
                <p className="text-slate-400 text-sm font-medium tracking-wide">
                    Loading canvas…
                </p>
            </div>
        </div>
    );
}
