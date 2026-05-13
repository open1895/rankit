
-- 1. boost_campaigns: column-level privileges to hide started_by from clients
REVOKE SELECT ON public.boost_campaigns FROM anon, authenticated;
GRANT SELECT (id, creator_id, ends_at, started_at, status, current_points, goal, created_at, completed_at)
  ON public.boost_campaigns TO anon, authenticated;

-- 2. creator_auto_add_runs: block writes for non-admins
CREATE POLICY "Only admins can insert auto add runs"
  ON public.creator_auto_add_runs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Only admins can update auto add runs"
  ON public.creator_auto_add_runs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Only admins can delete auto add runs"
  ON public.creator_auto_add_runs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. creator_milestone_notifications: block writes for non-admins
CREATE POLICY "Only admins can insert milestone notifications"
  ON public.creator_milestone_notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Only admins can update milestone notifications"
  ON public.creator_milestone_notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Only admins can delete milestone notifications"
  ON public.creator_milestone_notifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
