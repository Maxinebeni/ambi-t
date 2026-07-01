
-- 1. Create departments table
CREATE TABLE public.departments (
  name TEXT PRIMARY KEY,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read departments" ON public.departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "managers add departments" ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "managers delete non-locked departments" ON public.departments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'manager') AND is_locked = false);

INSERT INTO public.departments (name, is_locked) VALUES
  ('Finance', true), ('Operations', true), ('Marketing', true), ('IT', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Convert department columns from enum to text
ALTER TABLE public.tasks ALTER COLUMN department TYPE TEXT USING department::TEXT;
ALTER TABLE public.projects ALTER COLUMN department TYPE TEXT USING department::TEXT;
ALTER TABLE public.profiles ALTER COLUMN department TYPE TEXT USING department::TEXT;
ALTER TABLE public.annual_goals ALTER COLUMN department TYPE TEXT USING department::TEXT;
ALTER TABLE public.quarterly_milestones ALTER COLUMN department TYPE TEXT USING department::TEXT;

-- 3. Update handle_new_user to accept any text department
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'department','')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $function$;

-- 4. Drop the now-unused enum type (safe: no columns reference it)
DROP TYPE IF EXISTS public.department;
