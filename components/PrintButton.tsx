"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 print:hidden">
      🖨️ Print
    </button>
  );
}
