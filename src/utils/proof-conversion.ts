import { exchangeReference, positiveAmount } from './event-policy';
import { onchainEventDate } from './onchain-summary';

type ProofRow = Record<string, unknown>;
const eventDay = (value: unknown) => typeof value === 'string' ? onchainEventDate(value) : null;

export function proofConversion(row: ProofRow, rows: ProofRow[]) {
  const day = eventDay(row['block_time']);
  const rate = day ? exchangeReference(rows.filter(event => eventDay(event['block_time']) === day)) : null;
  const usdc = positiveAmount(row['amount_usdc']);
  return { day, rate, usdc, calculatedBRL: rate === null ? null : usdc * rate };
}