import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="font-headline font-bold text-xl text-on-surface mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-on-surface-variant max-w-xs mb-6">
        An unexpected error occurred. You can try reloading this section.
      </p>
      <button
        onClick={resetErrorBoundary}
        className="bg-primary text-on-primary py-2.5 px-5 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all"
      >
        Try Again
      </button>
      <details className="mt-4 text-xs text-on-surface-variant/50 max-w-sm">
        <summary className="cursor-pointer">Error details</summary>
        <pre className="mt-2 text-left whitespace-pre-wrap break-words">
          {error.message}
        </pre>
      </details>
    </div>
  );
}

export function ErrorBoundary({ children }: Props) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        console.error('[ErrorBoundary]', { error: error.message, componentStack: info.componentStack });
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
