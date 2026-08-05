ALTER TABLE public.watches ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'page';
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS entry_date date;
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS entry_url text;
ALTER TABLE public.changes ADD COLUMN IF NOT EXISTS entry_date date;
ALTER TABLE public.changes ADD COLUMN IF NOT EXISTS entry_url text;
CREATE UNIQUE INDEX IF NOT EXISTS snapshots_watch_entry_hash_idx ON public.snapshots (watch_id, entry_date, content_hash) WHERE entry_date IS NOT NULL;

INSERT INTO public.watches (url, vendor, role, dependency_position, cadence, use_firecrawl, kind)
SELECT 'https://developers.deepgram.com/changelog', 'Deepgram', 'STT', 'on-path', 'manual', false, 'dated_feed'
WHERE NOT EXISTS (SELECT 1 FROM public.watches WHERE url = 'https://developers.deepgram.com/changelog');

INSERT INTO public.watches (url, vendor, role, dependency_position, cadence, use_firecrawl, kind)
SELECT 'https://elevenlabs.io/docs/changelog', 'ElevenLabs', 'TTS', 'on-path', 'manual', false, 'dated_feed'
WHERE NOT EXISTS (SELECT 1 FROM public.watches WHERE url = 'https://elevenlabs.io/docs/changelog');