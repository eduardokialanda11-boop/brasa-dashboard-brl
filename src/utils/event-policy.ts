export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export function positiveAmount(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function isVerifiedUSDC(row: {
  token_symbol?: unknown;
  token_mint?: unknown;
  amount_usdc?: unknown;
}): boolean {
  return row.token_symbol === "USDC" && row.token_mint === USDC_MINT && positiveAmount(row.amount_usdc) > 0;
}

// Only paired positive values support a derived exchange reference.
export function exchangeReference(rows: { amount_brl?: unknown; amount_usdc?: unknown }[]): number | null {
  let brl = 0;
  let usdc = 0;
  for (const row of rows) {
    const rowBRL = positiveAmount(row.amount_brl);
    const rowUSDC = positiveAmount(row.amount_usdc);
    if (rowBRL === 0 || rowUSDC === 0) continue;
    brl += rowBRL;
    usdc += rowUSDC;
  }
  return brl > 0 && usdc > 0 ? brl / usdc : null;
}