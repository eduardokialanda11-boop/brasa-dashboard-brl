import { onchainEventDate } from "./onchain-summary";

export function startOfDayInSP(selectedDate: Date) {
  const day = onchainEventDate(selectedDate);
  if (!day) throw new Error("Invalid selected date");
  const target = Date.parse(`${day}T00:00:00Z`);
  let timestamp = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(timestamp));
    const part = (type: string) => parts.find(p => p.type === type)?.value;
    const local = Date.parse(`${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}Z`);
    timestamp += target - local;
  }
  return new Date(timestamp).toISOString();
}

export function endOfDayInSP(selectedDate: Date) {
  const day = onchainEventDate(selectedDate);
  if (!day) throw new Error("Invalid selected date");
  const nextDay = new Date(`${day}T15:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return new Date(Date.parse(startOfDayInSP(nextDay)) - 1).toISOString();
}

export function proofsForDate<T extends Record<string, unknown>>(rows: T[], referenceDate: string) {
  if (!referenceDate) return [];
  const selectedDate = new Date(`${referenceDate}T15:00:00Z`);
  if (!Number.isFinite(selectedDate.getTime())) return [];
  const start = Date.parse(startOfDayInSP(selectedDate));
  const end = Date.parse(endOfDayInSP(selectedDate));
  return rows.filter((row) => {
    const timestamp = row["block_time"];
    const time = typeof timestamp === "string" ? Date.parse(timestamp) : NaN;
    return time >= start && time <= end;
  });
}