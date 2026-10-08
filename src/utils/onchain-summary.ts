export type OnchainEvent = {
  signature: string | null;
  amount_brl: number | string | null;
  amount_usdc: number | string | null;
  block_time: string | null;
  origem: string | null;
};
export type DailyVolume = { date: string; total_brl: number; total_usdc: number; tx_count: number; usd_brl_rate: number | null };
const numberFrom = (value: number | string | null) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};
export function summarizeEvents(events: OnchainEvent[], currentDate: string) {
  const days = new Map<string, DailyVolume>();
  const origins: Record<string, number> = {};
  const accumulated = { totalBRL: 0, totalUSDC: 0, txCount: events.length };
  const today: DailyVolume = { date: currentDate, total_brl: 0, total_usdc: 0, tx_count: 0, usd_brl_rate: null };
  const midnight = new Date(`${currentDate}T00:00:00Z`).getTime();
  for (const event of events) {
    const brl = numberFrom(event.amount_brl);
    const usdc = numberFrom(event.amount_usdc);
    accumulated.totalBRL += brl;
    accumulated.totalUSDC += usdc;
    const origin = event.origem ?? 'Sem origem';
    origins[origin] = (origins[origin] ?? 0) + 1;
    const time = event.block_time ? new Date(event.block_time).getTime() : NaN;
    if (!Number.isFinite(time)) continue;
    const date = new Date(time).toISOString().slice(0, 10);
    const day = days.get(date) ?? { date, total_brl: 0, total_usdc: 0, tx_count: 0, usd_brl_rate: null };
    day.total_brl += brl;
    day.total_usdc += usdc;
    day.tx_count += 1;
    days.set(date, day);
    if (time >= midnight) {
      today.total_brl += brl;
      today.total_usdc += usdc;
      today.tx_count += 1;
    }
  }
  return { accumulated, today, days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)), origins };
}
export function eventRewards(totalBRL: number) {
  return { economy: totalBRL * 0.037, points: totalBRL * 100 };
}
