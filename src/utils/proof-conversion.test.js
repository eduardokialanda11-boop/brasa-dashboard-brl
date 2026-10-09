import { expect, test } from 'bun:test';
import { proofConversion } from './proof-conversion';

test('calculated BRL equals recorded USDC multiplied by the day reference', () => {
  const row = { amount_usdc: 4.12, amount_brl: 4.12 * 5.19, block_time: '2026-10-09T11:54:00Z' };
  const conversion = proofConversion(row, [row]);
  expect(conversion.rate).toBeCloseTo(5.19, 8);
  expect(conversion.calculatedBRL).toBeCloseTo(21.3828, 8);
});
test('day reference excludes other dates and uses all real same-day rows', () => {
  const row = { amount_usdc: 4, amount_brl: 20, block_time: '2026-10-09T11:54:00Z' };
  const rows = [row, { amount_usdc: 6, amount_brl: 40, block_time: '2026-10-09T12:00:00Z' }, { amount_usdc: 10, amount_brl: 1000, block_time: '2026-10-08T12:00:00Z' }];
  expect(proofConversion(row, rows)).toMatchObject({ rate: 6, usdc: 4, calculatedBRL: 24 });
});
test('missing exchange basis remains unavailable rather than inventing PTAX', () => {
  const row = { amount_usdc: 0, amount_brl: 20, block_time: null };
  expect(proofConversion(row, [row]).calculatedBRL).toBeNull();
});