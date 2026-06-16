
-- Add IT to department enum (used by goals/milestones; existing data unaffected)
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'IT';

-- Status enum for goals/milestones
DO $$ BEGIN
  CREATE TYPE public.goal_status AS ENUM ('on_track','at_risk','behind','complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quarter AS ENUM ('Q1','Q2','Q3','Q4');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- annual_plans
CREATE TABLE IF NOT EXISTS public.annual_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.annual_plans TO authenticated;
GRANT ALL ON public.annual_plans TO service_role;
ALTER TABLE public.annual_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read plans" ON public.annual_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "manager insert plans" ON public.annual_plans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'manager'));
CREATE POLICY "manager update plans" ON public.annual_plans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'manager'));
CREATE POLICY "manager delete plans" ON public.annual_plans FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'manager'));
CREATE TRIGGER tr_annual_plans_touch BEFORE UPDATE ON public.annual_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- annual_goals
CREATE TABLE IF NOT EXISTS public.annual_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.annual_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  department public.department,
  owner_id UUID,
  status public.goal_status NOT NULL DEFAULT 'on_track',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.annual_goals TO authenticated;
GRANT ALL ON public.annual_goals TO service_role;
ALTER TABLE public.annual_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read goals" ON public.annual_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "manager insert goals" ON public.annual_goals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'manager'));
CREATE POLICY "manager update goals" ON public.annual_goals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'manager'));
CREATE POLICY "manager delete goals" ON public.annual_goals FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'manager'));
CREATE TRIGGER tr_annual_goals_touch BEFORE UPDATE ON public.annual_goals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- quarterly_milestones
CREATE TABLE IF NOT EXISTS public.quarterly_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.annual_goals(id) ON DELETE CASCADE,
  quarter public.quarter NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  department public.department,
  owner_id UUID,
  status public.goal_status NOT NULL DEFAULT 'on_track',
  completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quarterly_milestones TO authenticated;
GRANT ALL ON public.quarterly_milestones TO service_role;
ALTER TABLE public.quarterly_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read milestones" ON public.quarterly_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "manager insert milestones" ON public.quarterly_milestones FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'manager'));
CREATE POLICY "manager update milestones" ON public.quarterly_milestones FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'manager'));
CREATE POLICY "manager delete milestones" ON public.quarterly_milestones FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'manager'));
CREATE TRIGGER tr_milestones_touch BEFORE UPDATE ON public.quarterly_milestones FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Link projects to a milestone (optional)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.quarterly_milestones(id) ON DELETE SET NULL;
