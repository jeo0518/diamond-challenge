// Shown on owner pages while the owner's restaurant is waiting for approval.
export default function ApprovalBanner() {
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" data-testid="approval-banner">
      <p className="font-semibold">⏳ Waiting for approval</p>
      <p>
        Customers can&apos;t see your restaurant yet. Our team reviews new restaurants before they go live. Meanwhile, finish
        your profile, menu, pricing, and time slots so you&apos;re ready.
      </p>
    </div>
  );
}
