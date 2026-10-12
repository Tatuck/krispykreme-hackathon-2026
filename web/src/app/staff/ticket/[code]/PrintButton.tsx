"use client";
export function PrintButton({ label }: { label: string }) {
  return (
    <button onClick={() => window.print()} className="btn-green px-4 py-2 text-xs">
      {label}
    </button>
  );
}
