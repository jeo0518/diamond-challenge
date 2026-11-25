// Vertical status timeline for the customer's order page.
import type { TimelineStep } from "@/lib/timeline";
import { STATUS_LABELS } from "@/lib/orderStatus";
import { formatDateTime } from "@/lib/format";

const DOT: Record<TimelineStep["state"], string> = {
  done: "bg-green-600 border-green-600",
  current: "bg-orange-500 border-orange-500 ring-4 ring-orange-100",
  upcoming: "bg-white border-gray-300",
  stopped: "bg-red-600 border-red-600",
};

export default function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-0" data-testid="timeline">
      {steps.map((step, i) => (
        <li key={step.status} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && <span className="absolute left-[7px] top-4 h-full w-0.5 bg-gray-200" aria-hidden />}
          <span className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${DOT[step.state]}`} aria-hidden />
          <div className="min-w-0">
            <p className={`text-sm ${step.state === "upcoming" ? "text-gray-400" : "font-medium"} ${step.state === "stopped" ? "text-red-700" : ""}`}>
              {STATUS_LABELS[step.status]}
              {step.state === "current" && <span className="ml-2 text-xs font-semibold text-orange-600">now</span>}
            </p>
            {step.at && <p className="text-xs text-gray-500">{formatDateTime(step.at)}</p>}
            {step.note && step.state !== "upcoming" && <p className="text-xs text-gray-600">{step.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
