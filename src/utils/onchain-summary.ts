export type OnchainEvent = {
  signature: string | null;
  amount_brl: number | string | null;
  amount_usdc: number | string | null;
  block_time: string | null;
  origem: string | null;
  token_symbol?: string | null;
  token_mint?: string | null;
};

export type DailyVolume = {
  date: string;
  total_brl: number;
  total_usdc: number;
  tx_count: number;
  usd_brl_rate: number | null;
};

const USDC_MINT =
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const numberFrom = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

export function onchainEventDate(value: string | Date): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;

  const year = part("year");
  const month = part("month");
  const day = part("day");

  return year && month && day
    ? `${year}-${month}-${day}`
    : null;
}

function isVerifiedUSDC(event: OnchainEvent): boolean {
  return (
    event.token_symbol === "USDC" &&
    event.token_mint === USDC_MINT
  );
}

export function summarizeEvents(
  events: OnchainEvent[],
  currentDate: string,
) {
  const days = new Map<string, DailyVolume>();
  const origins: Record<string, number> = {};

  const accumulated = {
    totalBRL: 0,
    totalUSDC: 0,
    txCount: 0,
  };

  const today: DailyVolume = {
    date: currentDate,
    total_brl: 0,
    total_usdc: 0,
    tx_count: 0,
    usd_brl_rate: null,
  };

  for (const event of events) {
    if (!isVerifiedUSDC(event)) {
      continue;
    }

    const usdc = numberFrom(event.amount_usdc);

    if (usdc <= 0) {
      continue;
    }

    const brl = numberFrom(event.amount_brl);
    const date = event.block_time
      ? onchainEventDate(event.block_time)
      : null;

    accumulated.totalBRL += brl;
    accumulated.totalUSDC += usdc;
    accumulated.txCount += 1;

    const origin = event.origem ?? "Sem origem";
    origins[origin] = (origins[origin] ?? 0) + 1;

    if (!date) {
      continue;
    }

    const day = days.get(date) ?? {
      date,
      total_brl: 0,
      total_usdc: 0,
      tx_count: 0,
      usd_brl_rate: null,
    };

    day.total_brl += brl;
    day.total_usdc += usdc;
    day.tx_count += 1;

    days.set(date, day);

    if (date === currentDate) {
      today.total_brl += brl;
      today.total_usdc += usdc;
      today.tx_count += 1;
    }
  }

  return {
    accumulated,
    today,
    days: [...days.values()].sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    origins,
  };
}

export function eventRewards(totalBRL: number) {
  // Estimativa provisória: não representa economia comprovada.
  const estimatedSavingsRate = 0.023;

  return {
    economy: Math.max(0, totalBRL) * estimatedSavingsRate,
    points: Math.max(0, totalBRL) * 100,
  };
}
