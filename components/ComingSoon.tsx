// Temporary placeholder for pages that later milestones will build.
export default function ComingSoon({ title, milestone, children }: { title: string; milestone: number; children?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
      <p className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
        This page is built in Milestone {milestone}.
      </p>
    </div>
  );
}
