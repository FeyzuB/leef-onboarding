'use client';

import { CircleAlert, RotateCcw } from 'lucide-react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 ring-1 ring-red-200">
        <CircleAlert size={20} />
      </span>
      <div>
        <h1 className="text-lg font-bold text-red-800">That didn&apos;t work</h1>
        <p className="mt-1 text-sm text-red-700">
          {process.env.NODE_ENV === 'development' ? error.message : 'Check the form and try again. If it keeps failing, contact the portal admin.'}
        </p>
        {error.digest && <p className="mt-1 text-xs text-red-600">Reference: {error.digest}</p>}
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <RotateCcw size={14} /> Go back
        </button>
      </div>
    </div>
  );
}
