'use client';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-red-800">That didn&apos;t work</h1>
      <p className="mt-1 text-sm text-red-700">
        {process.env.NODE_ENV === 'development' ? error.message : 'Check the form and try again. If it keeps failing, contact the portal admin.'}
      </p>
      {error.digest && <p className="mt-1 text-xs text-red-600">Reference: {error.digest}</p>}
      <button type="button" onClick={reset} className="mt-4 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-100">
        Go back
      </button>
    </div>
  );
}
