import { expect, test } from 'bun:test';
import connection from '../lib/dashboard-connection.json';

test('dashboard browser configuration points exclusively to the original external project', () => {
  expect(connection.VITE_SUPABASE_URL).toBe('https://npxytlxjnoqpyoukpppi.supabase.co');
  expect(connection.VITE_SUPABASE_PROJECT_ID).toBe('npxytlxjnoqpyoukpppi');
});

test('both browser key aliases use the same non-privileged public credential', () => {
  const key = connection.VITE_SUPABASE_ANON_KEY;
  const sameAlias = key === connection.VITE_SUPABASE_PUBLISHABLE_KEY;
  expect(sameAlias).toBe(true);
  let publicOnly = key.startsWith('sb_publishable_');
  if (key.split('.').length === 3) {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
    publicOnly = payload.role === 'anon' && payload.ref === 'npxytlxjnoqpyoukpppi';
  }
  expect(publicOnly).toBe(true);
});