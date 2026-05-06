-- Automatically maintain assignment completion based on micro-tasks/subtasks.
-- When all tasks for an assignment are completed, mark the assignment completed.
-- This keeps the logic correct even if tasks are updated from different clients or edge functions.

CREATE OR REPLACE FUNCTION public.sync_assignment_completion_from_tasks(p_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  total_count integer := 0;
  completed_count integer := 0;
  pct integer := 0;
  done boolean := false;
BEGIN
  IF p_assignment_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE is_completed)::int
  INTO total_count, completed_count
  FROM public.tasks
  WHERE assignment_id = p_assignment_id
    AND task_type IN ('micro_task', 'subtask');

  IF total_count > 0 THEN
    pct := ROUND((completed_count::numeric / total_count::numeric) * 100)::int;
    done := (completed_count = total_count);
  ELSE
    pct := 0;
    done := false;
  END IF;

  UPDATE public.assignments
  SET
    completion_percentage = CASE WHEN done THEN 100 ELSE pct END,
    is_completed = done,
    updated_at = now()
  WHERE id = p_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_tasks_sync_assignment_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assignment_to_sync uuid;
BEGIN
  assignment_to_sync := COALESCE(NEW.assignment_id, OLD.assignment_id);

  -- Only sync when the task is linked to an assignment and is a subtask/micro_task.
  IF assignment_to_sync IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.task_type NOT IN ('micro_task', 'subtask') THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.task_type, OLD.task_type) NOT IN ('micro_task', 'subtask') THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.task_type NOT IN ('micro_task', 'subtask') THEN
      RETURN OLD;
    END IF;
  END IF;

  PERFORM public.sync_assignment_completion_from_tasks(assignment_to_sync);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tasks_sync_assignment_completion_ins ON public.tasks;
DROP TRIGGER IF EXISTS tasks_sync_assignment_completion_upd ON public.tasks;
DROP TRIGGER IF EXISTS tasks_sync_assignment_completion_del ON public.tasks;

CREATE TRIGGER tasks_sync_assignment_completion_ins
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.trg_tasks_sync_assignment_completion();

CREATE TRIGGER tasks_sync_assignment_completion_upd
AFTER UPDATE OF is_completed, assignment_id, task_type ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.trg_tasks_sync_assignment_completion();

CREATE TRIGGER tasks_sync_assignment_completion_del
AFTER DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.trg_tasks_sync_assignment_completion();

