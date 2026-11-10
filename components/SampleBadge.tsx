// Yellow badge shown everywhere a SAMPLE (made-up) restaurant appears.
export default function SampleBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-md border border-yellow-400 bg-yellow-200 px-2 py-0.5 text-xs font-bold text-yellow-900 ${className}`}
    >
      SAMPLE — not a real restaurant
    </span>
  );
}
