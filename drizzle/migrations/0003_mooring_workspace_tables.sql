CREATE TABLE public.stack_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  block text NOT NULL,
  vendor text NOT NULL,
  product text,
  added_via text NOT NULL DEFAULT 'setup',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stack_items_workspace_idx ON public.stack_items (workspace_id);

CREATE TABLE public.owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  type text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, type)
);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  change_id uuid NOT NULL REFERENCES public.changes(id) ON DELETE CASCADE,
  item_index integer NOT NULL DEFAULT 0,
  vendor text NOT NULL,
  product text,
  type text NOT NULL,
  kind text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  why text,
  action text,
  deadline text,
  notice_days integer,
  source_url text,
  published_at date,
  status text NOT NULL DEFAULT 'open',
  sent_to text,
  remind_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, change_id, item_index)
);
CREATE INDEX alerts_workspace_idx ON public.alerts (workspace_id, published_at DESC);
CREATE INDEX alerts_change_idx ON public.alerts (change_id);

CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  total integer,
  per_vendor jsonb NOT NULL DEFAULT '{}'::jsonb,
  per_type jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_count integer NOT NULL DEFAULT 0
);
CREATE INDEX scores_workspace_idx ON public.scores (workspace_id, computed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stack_items, public.owners, public.alerts, public.scores TO authenticated;
GRANT ALL ON public.stack_items, public.owners, public.alerts, public.scores TO service_role;

ALTER TABLE public.stack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own stack items" ON public.stack_items FOR ALL TO authenticated
  USING (workspace_id = (select auth.uid())) WITH CHECK (workspace_id = (select auth.uid()));
CREATE POLICY "Own owners" ON public.owners FOR ALL TO authenticated
  USING (workspace_id = (select auth.uid())) WITH CHECK (workspace_id = (select auth.uid()));
CREATE POLICY "Own alerts" ON public.alerts FOR ALL TO authenticated
  USING (workspace_id = (select auth.uid())) WITH CHECK (workspace_id = (select auth.uid()));
CREATE POLICY "Own scores" ON public.scores FOR ALL TO authenticated
  USING (workspace_id = (select auth.uid())) WITH CHECK (workspace_id = (select auth.uid()));