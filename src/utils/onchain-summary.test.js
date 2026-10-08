import { expect, test } from 'bun:test';
import { eventRewards, summarizeEvents } from './onchain-summary';
const event = (overrides = {}) => ({ signature: null, amount_brl: 100, amount_usdc: 20, block_time: '2026-10-08T00:00:00Z', origem: 'gateway_direto', ...overrides });
test('daily totals include midnight and exclude previous dates', () => {
  const result = summarizeEvents([event(), event({ block_time: '2026-10-07T23:59:59Z', amount_brl: 200 })], '2026-10-08');
  expect(result.today).toMatchObject({ total_brl: 100, total_usdc: 20, tx_count: 1 });
});
test('all 49 events are included without origin filters', () => {
  const rows = [...Array.from({ length: 38 }, () => event()), ...Array.from({ length: 11 }, () => event({ origem: 'debridge_brla' }))];
  const result = summarizeEvents(rows, '2026-10-08');
  expect(result.accumulated).toEqual({ totalBRL: 4900, totalUSDC: 980, txCount: 49 });
  expect(result.origins).toEqual({ gateway_direto: 38, debridge_brla: 11 });
});
test('economy equals 3.7 percent of summed BRL', () => {
  expect(eventRewards(1000).economy).toBe(37);
});
test('points equal summed BRL multiplied by 100', () => {
  expect(eventRewards(1000).points).toBe(100000);
});
