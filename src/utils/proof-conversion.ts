type ProofRow = Record<string, unknown>;

const finiteNumber = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const utcDay = (value: unknown) => {
  if (typeof value !== "string") return null;
  const time = new Date(value);
  return Number.isFinite(time.getTime()) ? time.toISOString().slice(0, 10) : null;
};

export function proofConversion(row: ProofRow, rows: ProofRow[]) {
  const day = utcDay(row.block_time);
  const totals = rows.reduce((sum, event) => {
    if (!day || utcDay(event.block_time) !== day) return sum;
    return { brl: sum.brl + finiteNumber(event.amount_brl), usdc: sum.usdc + finiteNumber(event.amount_usdc) };
  }, { brl: 0, usdc: 0 });
  const rate = totals.brl > 0 && totals.usdc > 0 ? totals.brl / totals.usdc : null;
  const usdc = finiteNumber(row.amount_usdc);
  return { day, rate, usdc, calculatedBRL: rate === null ? null : usdc * rate };
}