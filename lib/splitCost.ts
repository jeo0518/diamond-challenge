// "Split cost": each person's share of the order total.
// Shares are proportional to what each person ordered, so the bulk discount
// and fees are shared the same way. Shares always add up EXACTLY to the total
// (leftover cents go to the people with the largest remainders).

export type Share = { person: string; itemsCents: number; shareCents: number };

export function splitCost(perPersonCents: Map<string, number>, totalCents: number): Share[] {
  const people = [...perPersonCents.entries()];
  const itemsTotal = people.reduce((s, [, c]) => s + c, 0);
  if (people.length === 0) return [];
  if (itemsTotal === 0) {
    // Nothing ordered by anyone (only fees) — split evenly.
    return splitCost(new Map(people.map(([p]) => [p, 1])), totalCents).map((s) => ({ ...s, itemsCents: 0 }));
  }

  const exact = people.map(([person, cents]) => ({ person, itemsCents: cents, raw: (totalCents * cents) / itemsTotal }));
  const shares = exact.map((e) => ({ ...e, shareCents: Math.floor(e.raw) }));
  let leftover = totalCents - shares.reduce((s, e) => s + e.shareCents, 0);
  // Hand out the leftover cents one at a time, biggest fractional part first.
  for (const e of [...shares].sort((a, b) => (b.raw - Math.floor(b.raw)) - (a.raw - Math.floor(a.raw)))) {
    if (leftover <= 0) break;
    e.shareCents += 1;
    leftover -= 1;
  }
  return shares.map(({ person, itemsCents, shareCents }) => ({ person, itemsCents, shareCents }));
}
