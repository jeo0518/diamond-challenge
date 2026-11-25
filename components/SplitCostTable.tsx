// "Split cost" table: each person's share of the total.
import { splitCost } from "@/lib/splitCost";
import { formatCents } from "@/lib/format";

export default function SplitCostTable({ perPerson, total, isEstimate }: { perPerson: Map<string, number>; total: number; isEstimate: boolean }) {
  const shares = splitCost(perPerson, total).sort((a, b) => a.person.localeCompare(b.person));
  if (shares.length === 0) return <p className="text-sm text-gray-500">No items yet.</p>;
  return (
    <div>
      <table className="w-full text-sm" data-testid="split-cost">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-1 font-medium">Person</th>
            <th className="pb-1 text-right font-medium">Their items</th>
            <th className="pb-1 text-right font-medium">Pays</th>
          </tr>
        </thead>
        <tbody>
          {shares.map((s) => (
            <tr key={s.person} className="border-t border-gray-100">
              <td className="py-1">{s.person}</td>
              <td className="py-1 text-right text-gray-600">{formatCents(s.itemsCents)}</td>
              <td className="py-1 text-right font-semibold">{formatCents(s.shareCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 font-bold">
            <td className="pt-1">Total</td>
            <td />
            <td className="pt-1 text-right">{formatCents(total)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-xs text-gray-500">
        Each person pays in proportion to what they ordered, so the bulk discount and fees are shared the same way.
        {isEstimate && " Estimate — the final total is set when the order is submitted."}
      </p>
    </div>
  );
}
