DROP POLICY IF EXISTS pix_onchain_events_import ON public.pix_onchain_events;
REVOKE INSERT ON public.pix_onchain_events FROM anon;
REVOKE UPDATE ON public.pix_onchain_events FROM anon;
COMMENT ON COLUMN public.pix_onchain_events.import_marker IS 'DEPRECATED: unused import guard left from the one-time data copy; the app never reads it.';