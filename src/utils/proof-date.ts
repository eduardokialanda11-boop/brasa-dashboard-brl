import { onchainEventDate } from "./onchain-summary";

export function proofsForDate<T extends Record<string, unknown>>(rows: T[], referenceDate: string) {
  if (!referenceDate) return [];
  return rows.filter((row) => {
    const timestamp = row["block_time"];
    return typeof timestamp === "string" && onchainEventDate(timestamp) === referenceDate;
  });
}