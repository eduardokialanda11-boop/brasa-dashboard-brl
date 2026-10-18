import { expect, test } from 'bun:test';
import { eventRewards, summarizeEvents } from './onchain-summary';
import { formatBRL } from './format';
const event = (overrides = {}) => ({ signature: null, amount_brl: 100, amount_usdc: 20, block_time: '2026-10-08T03:00:00Z', origem: 'gateway_direto', token_symbol: 'USDC', token_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', ...overrides });
test('daily totals include midnight and exclude previous dates', () => {
  const result = summarizeEvents([event(), event({ block_time: '2026-10-08T02:59:59Z', amount_brl: 200 })], '2026-10-08');
  expect(result.today).toMatchObject({ total_brl: 100, total_usdc: 20, tx_count: 1 });
});
test('all 49 events are included without origin filters', () => {
  const rows = [...Array.from({ length: 38 }, () => event()), ...Array.from({ length: 11 }, () => event({ origem: 'debridge_brla' }))];
  const result = summarizeEvents(rows, '2026-10-08');
  expect(result.accumulated).toEqual({ totalBRL: 4900, totalUSDC: 980, txCount: 49 });
  expect(result.origins).toEqual({ gateway_direto: 38, debridge_brla: 11 });
});
test('economy equals 5.7 percent of summed BRL', () => {
  expect(eventRewards(1000).economy).toBe(57);
});
test('October 9 daily economy uses its own 23552 BRL volume', () => {
  expect(formatBRL(eventRewards(23552).economy).replace(/\s/g, ' ')).toBe('R$ 1.342,46');
});
test('October 8 daily economy uses its own 61533 BRL volume', () => {
  expect(formatBRL(eventRewards(61533).economy).replace(/\s/g, ' ')).toBe('R$ 3.507,38');
});
test('accumulated economy uses the combined real volume, not a selected day', () => {
  const rows = [event({ amount_brl: 23552, block_time: '2026-10-09T12:00:00Z' }), event({ amount_brl: 61533, block_time: '2026-10-08T12:00:00Z' })];
  const summary = summarizeEvents(rows, '2026-10-09');
  expect(formatBRL(eventRewards(summary.accumulated.totalBRL).economy).replace(/\s/g, ' ')).toBe('R$ 4.849,85');
});
test('points equal summed BRL multiplied by 100', () => {
  expect(eventRewards(1000).points).toBe(100000);
});
test('51 eligible fixture events count, including rows without signatures', () => {
  const rows = [...Array.from({ length: 40 }, () => event()), ...Array.from({ length: 11 }, () => event({ origem: 'debridge_brla' }))];
  expect(summarizeEvents(rows, '2026-10-08').accumulated.txCount).toBe(51);
});
test('unverified tokens cannot inflate the USDC total', () => {
  const rows = [event(), event({ token_mint: 'other' }), event({ token_symbol: 'USDT' }), event({ amount_usdc: -1 }), event({ amount_usdc: Infinity })];
  expect(summarizeEvents(rows, '2026-10-08').accumulated).toEqual({ totalBRL: 100, totalUSDC: 20, txCount: 1 });
});
test('exchange reference excludes records without paired BRL values', () => {
  const result = summarizeEvents([event(), event({ amount_brl: null, amount_usdc: 100 })], '2026-10-08');
  expect(result.today.usd_brl_rate).toBe(5);
  expect(result.today.total_usdc).toBe(120);
});
