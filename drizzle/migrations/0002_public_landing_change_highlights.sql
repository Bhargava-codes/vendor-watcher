CREATE OR REPLACE FUNCTION public.get_public_change_highlights()
RETURNS TABLE (
  id uuid,
  vendor text,
  section text,
  before_text text,
  after_text text,
  change_type text,
  priority text,
  interpretation text,
  routed_to text,
  entry_date date,
  entry_url text,
  detected_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    c.id,
    w.vendor,
    item->>'section' AS section,
    item->>'before' AS before_text,
    item->>'after' AS after_text,
    item->>'change_type' AS change_type,
    item->>'priority' AS priority,
    item->>'interpretation' AS interpretation,
    item->>'routed_to' AS routed_to,
    c.entry_date,
    c.entry_url,
    c.detected_at
  FROM public.changes AS c
  JOIN public.watches AS w ON w.id = c.watch_id
  CROSS JOIN LATERAL jsonb_array_elements(c.classifier_output->'changes') AS item
  WHERE c.entry_url LIKE 'https://%'
    AND jsonb_typeof(c.classifier_output->'changes') = 'array'
    AND COALESCE((item->>'substantive')::boolean, false) IS TRUE
  ORDER BY
    CASE item->>'priority'
      WHEN 'P0' THEN 0
      WHEN 'P1' THEN 1
      WHEN 'P2' THEN 2
      WHEN 'P3' THEN 3
      ELSE 4
    END,
    c.detected_at DESC
  LIMIT 6;
$$;

REVOKE ALL ON FUNCTION public.get_public_change_highlights() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_change_highlights() TO anon, authenticated, service_role;