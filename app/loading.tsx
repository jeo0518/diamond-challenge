// Shown automatically while a page's data is loading.
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-20 text-gray-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-orange-600" aria-hidden />
      Loading…
    </div>
  );
}
