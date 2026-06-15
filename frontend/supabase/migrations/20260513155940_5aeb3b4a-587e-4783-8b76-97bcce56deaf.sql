
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.announcement_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX idx_ann_recipients_user ON public.announcement_recipients(user_id);
CREATE INDEX idx_ann_recipients_ann ON public.announcement_recipients(announcement_id);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'internal_staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'internal_staff'::app_role));

CREATE POLICY "Recipients view their announcements" ON public.announcements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.announcement_recipients ar WHERE ar.announcement_id = announcements.id AND ar.user_id = auth.uid()));

CREATE POLICY "Staff manage recipients" ON public.announcement_recipients FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'internal_staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'internal_staff'::app_role));

CREATE POLICY "Recipients view own row" ON public.announcement_recipients FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Recipients update own read state" ON public.announcement_recipients FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
