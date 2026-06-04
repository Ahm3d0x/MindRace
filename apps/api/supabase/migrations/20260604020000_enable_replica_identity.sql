-- ============================================================
-- Mind Race — Enable REPLICA IDENTITY FULL
-- Required for Supabase Realtime to send old row values on UPDATE
-- ============================================================

ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_rounds REPLICA IDENTITY FULL;
ALTER TABLE public.round_answers REPLICA IDENTITY FULL;
