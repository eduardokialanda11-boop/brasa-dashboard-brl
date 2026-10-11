import { expect, test } from "bun:test";
import { proofsForDate } from "./proof-date";
import { summarizeEvents } from "./onchain-summary";

const row = (signature, block_time) => ({ signature, block_time, amount_brl: 5.19, amount_usdc: 1, origem: "gateway_direto", token_symbol: "USDC", token_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" });
test("October 7 proofs exclude October 8 and match the daily card", () => {
  const rows = Array.from({ length: 70 }, (_, i) => row(`oct7-${i}`, "2026-10-07T12:00:00Z"));
  rows.push(row("oct8", "2026-10-08T12:00:00Z"));
  const proofs = proofsForDate(rows, "2026-10-07");
  expect(proofs).toHaveLength(70);
  expect(proofs.length).toBe(summarizeEvents(rows, "2026-10-07").today.tx_count);
  expect(proofsForDate(rows, "2026-10-08").map(r => r.signature)).toEqual(["oct8"]);
});
test("proofs use the same Sao Paulo midnight boundaries as cards", () => {
  const rows = [row("previous", "2026-10-07T02:59:59Z"), row("start", "2026-10-07T03:00:00Z"), row("end", "2026-10-08T02:59:59Z"), row("next", "2026-10-08T03:00:00Z")];
  expect(proofsForDate(rows, "2026-10-07").map(r => r.signature)).toEqual(["start", "end"]);
});
test("missing dates never fall back to all historical proofs", () => {
  expect(proofsForDate([row("other", "2026-10-08T12:00:00Z")], "2026-10-09")).toEqual([]);
  expect(proofsForDate([row("other", "2026-10-08T12:00:00Z")], "")).toEqual([]);
});