
-- Add new task statuses
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'blocked';

-- Add file attachment + co-assignees to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS co_assignees uuid[] NOT NULL DEFAULT '{}'::uuid[];
