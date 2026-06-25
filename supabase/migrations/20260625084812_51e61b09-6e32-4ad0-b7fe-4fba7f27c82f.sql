ALTER TABLE public.quarterly_milestones ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.annual_plans(id) ON DELETE CASCADE;
UPDATE public.quarterly_milestones m SET plan_id = g.plan_id FROM public.annual_goals g WHERE m.goal_id = g.id AND m.plan_id IS NULL;
ALTER TABLE public.quarterly_milestones ALTER COLUMN goal_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quarterly_milestones_plan_id ON public.quarterly_milestones(plan_id);