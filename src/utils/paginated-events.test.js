import { expect, test } from 'bun:test';
import { readCompleteEvents } from './paginated-events';

test('all 2501 rows are read beyond a single page', async () => {
  const source = Array.from({ length: 2501 }, (_, i) => i);
  const result = await readCompleteEvents(async (offset, size) => ({ rows: source.slice(offset, offset + size), count: source.length }));
  expect(result).toHaveLength(2501);
  expect(result.at(-1)).toBe(2500);
});
test('partial reads are rejected rather than reported as complete totals', async () => {
  await expect(readCompleteEvents(async () => ({ rows: [1], count: 2 }))).rejects.toThrow('Leitura incompleta');
});
test('changing counts trigger a complete retry', async () => {
  let calls = 0;
  const result = await readCompleteEvents(async (offset) => {
    calls++;
    return { rows: offset === 0 ? [1, 2] : [3], count: calls === 1 ? 2 : 3 };
  }, 2);
  expect(result).toEqual([1, 2, 3]);
  expect(calls).toBe(4);
});