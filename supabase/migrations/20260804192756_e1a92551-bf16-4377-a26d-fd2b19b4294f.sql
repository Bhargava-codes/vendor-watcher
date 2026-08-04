CREATE TABLE public.watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  vendor text NOT NULL,
  dependency_position text NOT NULL DEFAULT 'off-path',
  cadence text NOT NULL DEFAULT 'manual',
  last_checked_at timestamptz NULL,
  last_status text NULL,
  use_firecrawl boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.watches TO anon;
GRANT SELECT ON public.watches TO authenticated;
GRANT ALL ON public.watches TO service_role;
ALTER TABLE public.watches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public reads on watches" ON public.watches FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated reads on watches" ON public.watches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service_role full access on watches" ON public.watches FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id uuid NOT NULL REFERENCES public.watches(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_hash text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.snapshots TO service_role;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service_role full access on snapshots" ON public.snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id uuid NOT NULL REFERENCES public.watches(id) ON DELETE CASCADE,
  snapshot_from uuid NULL REFERENCES public.snapshots(id) ON DELETE SET NULL,
  snapshot_to uuid NOT NULL REFERENCES public.snapshots(id) ON DELETE CASCADE,
  diff text NOT NULL,
  classifier_output jsonb NULL,
  detected_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.changes TO anon;
GRANT SELECT ON public.changes TO authenticated;
GRANT ALL ON public.changes TO service_role;
ALTER TABLE public.changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public reads on changes" ON public.changes FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated reads on changes" ON public.changes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service_role full access on changes" ON public.changes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.usage_manifest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.usage_manifest TO anon;
GRANT SELECT ON public.usage_manifest TO authenticated;
GRANT ALL ON public.usage_manifest TO service_role;
ALTER TABLE public.usage_manifest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public reads on usage_manifest" ON public.usage_manifest FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated reads on usage_manifest" ON public.usage_manifest FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service_role full access on usage_manifest" ON public.usage_manifest FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.watches (url, vendor, dependency_position, cadence, last_status, use_firecrawl) VALUES
  ('/mock/deepgram-changelog', 'Deepgram', 'on-path', 'manual', 'baseline', false),
  ('https://platform.openai.com/docs/changelog', 'OpenAI', 'on-path', 'manual', 'baseline', true),
  ('https://elevenlabs.io/docs/changelog', 'ElevenLabs', 'on-path', 'manual', 'baseline', true),
  ('https://krisp.ai/changelog', 'Krisp', 'degrading', 'manual', 'baseline', true);

INSERT INTO public.usage_manifest (data) VALUES (
  '{"deepgram":{"role":"STT","dependency_position":"on-path","uses":["/v1/listen","nova-2"],"pinned":["/v1/listen"]},"openai":{"role":"LLM","dependency_position":"on-path","uses":["gpt-4o"],"pinned":[]},"elevenlabs":{"role":"TTS","dependency_position":"on-path","uses":["ProcedureCompilerMode","eleven_turbo_v2"],"pinned":[]},"krisp":{"role":"noise-cancel","dependency_position":"degrading","uses":[],"pinned":[]}}'::jsonb
);

-- Pre-stage the baseline snapshot for the mock watch so the first live run shows a diff immediately.
WITH mock_watch AS (
  SELECT id FROM public.watches WHERE url = '/mock/deepgram-changelog' LIMIT 1
)
INSERT INTO public.snapshots (watch_id, content, content_hash, fetched_at)
SELECT mock_watch.id,
       '# Deepgram Changelog

## Models
nova-2 (acoustic model v2.1)

## Changelog
/v1/listen

## Pricing
gpt-4o input $2.50 / 1M tokens

## Voice Agent API

## Hero
Fast, reliable noise cancellation.',
       'baseline-v1',
       now()
FROM mock_watch;

-- Update the mock watch to reflect the baseline snapshot was stored.
UPDATE public.watches
SET last_checked_at = now(), last_status = 'baseline'
WHERE url = '/mock/deepgram-changelog';