"use client";

import { useState, useEffect, ReactNode } from "react";

interface Props<T> {
  url: string;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
}

export default function DataLoader<T>({ url, children, skeleton }: Props<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [url]);

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 text-sm">
        Kunde inte ladda data: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <>
        {skeleton || (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[var(--border)] rounded w-1/3" />
            <div className="h-64 bg-[var(--border)] rounded" />
          </div>
        )}
      </>
    );
  }

  return <>{children(data)}</>;
}
