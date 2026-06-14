
-- fix search_path on trigger fn
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- restrict SECURITY DEFINER execute
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- storage policies for proof-files bucket
CREATE POLICY "Users upload own proof files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proof-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own proof files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'proof-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Managers read all proof files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'proof-files' AND public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users delete own proof files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'proof-files' AND (storage.foldername(name))[1] = auth.uid()::text);
