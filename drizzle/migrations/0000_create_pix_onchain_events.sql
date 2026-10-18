CREATE TABLE public.pix_onchain_events (
  signature text PRIMARY KEY,
  wallet_address text,
  amount_brl numeric,
  amount_usdc numeric,
  block_time timestamptz NOT NULL,
  origem text,
  token_symbol text,
  gateway_origin text,
  token_mint text,
  import_marker text
);

CREATE INDEX pix_onchain_events_block_time_idx ON public.pix_onchain_events (block_time);

GRANT SELECT ON public.pix_onchain_events TO anon;
GRANT SELECT ON public.pix_onchain_events TO authenticated;
GRANT ALL ON public.pix_onchain_events TO service_role;

ALTER TABLE public.pix_onchain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY pix_onchain_events_read ON public.pix_onchain_events
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY pix_onchain_events_import ON public.pix_onchain_events
  FOR INSERT TO anon WITH CHECK (import_marker = 'brasa-import-4e71c3c51c432e21b0225865');

ALTER PUBLICATION supabase_realtime ADD TABLE public.pix_onchain_events;