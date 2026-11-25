DROP POLICY IF EXISTS "Allow public reads on watches" ON public.watches;
DROP POLICY IF EXISTS "Allow authenticated reads on watches" ON public.watches;
REVOKE SELECT ON public.watches FROM anon, authenticated;

DROP POLICY IF EXISTS "Allow public reads on changes" ON public.changes;
DROP POLICY IF EXISTS "Allow authenticated reads on changes" ON public.changes;
REVOKE SELECT ON public.changes FROM anon, authenticated;

DROP POLICY IF EXISTS "Allow public reads on usage_manifest" ON public.usage_manifest;
DROP POLICY IF EXISTS "Allow authenticated reads on usage_manifest" ON public.usage_manifest;
REVOKE SELECT ON public.usage_manifest FROM anon, authenticated;