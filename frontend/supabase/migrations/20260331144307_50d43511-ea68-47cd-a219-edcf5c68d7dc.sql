
-- ============================================================
-- PHASE 1: ENUMS, TABLES, ROLES
-- ============================================================

-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'internal_staff', 'client_user', 'provider_user');

-- Organization types
CREATE TYPE public.org_type AS ENUM ('client', 'provider_agency', 'internal');

-- Assignment status
CREATE TYPE public.assignment_status AS ENUM ('active', 'completed', 'pending', 'cancelled');

-- PTO/availability status
CREATE TYPE public.pto_status AS ENUM ('available', 'submitted', 'being_presented', 'booked', 'no_longer_available');

-- Document category
CREATE TYPE public.doc_category AS ENUM ('contract', 'confirmation_letter', 'onboarding', 'credentialing', 'cv_packet', 'invoice', 'w9', 'direct_deposit', 'general');

-- Audit action type
CREATE TYPE public.audit_action AS ENUM (
  'login', 'logout', 'login_failed',
  'file_upload', 'file_download', 'file_delete',
  'role_change', 'access_denied',
  'record_create', 'record_update', 'record_delete'
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type public.org_type NOT NULL DEFAULT 'client',
  domain TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (linked to auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  specialty TEXT,
  states_licensed TEXT,
  facility_name TEXT,
  facility_location TEXT,
  portal_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- USER ROLES (separate table, NOT on profiles)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ============================================================
-- ORG MEMBERSHIPS
-- ============================================================
CREATE TABLE public.org_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- ============================================================
-- ASSIGNMENTS (provider <-> client <-> recruiter)
-- ============================================================
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty TEXT,
  start_date DATE,
  end_date DATE,
  status public.assignment_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- PTO REQUESTS
-- ============================================================
CREATE TABLE public.pto_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES public.organizations(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  status public.pto_status NOT NULL DEFAULT 'submitted',
  specialty TEXT,
  states_licensed TEXT,
  client_name TEXT DEFAULT 'Optum',
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '45 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'secure-documents',
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  role_visibility public.app_role[] NOT NULL DEFAULT ARRAY['admin']::public.app_role[],
  category public.doc_category NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action public.audit_action NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- ============================================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get all org IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.org_memberships WHERE user_id = _user_id
$$;

-- Check if internal staff is assigned to a provider
CREATE OR REPLACE FUNCTION public.is_assigned_to(_staff_id UUID, _provider_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignments
    WHERE recruiter_id = _staff_id AND provider_id = _provider_id
  )
$$;

-- Insert audit log entry (security definer so RLS doesn't block inserts)
CREATE OR REPLACE FUNCTION public.log_audit(
  _user_id UUID,
  _action public.audit_action,
  _resource_type TEXT DEFAULT NULL,
  _resource_id TEXT DEFAULT NULL,
  _details JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (_user_id, _action, _resource_type, _resource_id, _details);
END;
$$;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pto_requests_updated_at BEFORE UPDATE ON public.pto_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pto_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: ORGANIZATIONS
-- ============================================================
CREATE POLICY "Admins can do everything on organizations"
  ON public.organizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ============================================================
-- RLS POLICIES: PROFILES
-- ============================================================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Internal staff can view assigned provider profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'internal_staff')
    AND public.is_assigned_to(auth.uid(), user_id)
  );

-- ============================================================
-- RLS POLICIES: USER_ROLES
-- ============================================================
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: ORG_MEMBERSHIPS
-- ============================================================
CREATE POLICY "Users can view own memberships"
  ON public.org_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all memberships"
  ON public.org_memberships FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: ASSIGNMENTS
-- ============================================================
CREATE POLICY "Admins can do everything on assignments"
  ON public.assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Recruiters can view their assignments"
  ON public.assignments FOR SELECT TO authenticated
  USING (recruiter_id = auth.uid());

CREATE POLICY "Providers can view their own assignments"
  ON public.assignments FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Clients can view assignments to their org"
  ON public.assignments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_user')
    AND client_org_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

-- ============================================================
-- RLS POLICIES: PTO_REQUESTS
-- ============================================================
CREATE POLICY "Providers can create own PTO"
  ON public.pto_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'provider_user')
    AND provider_id = auth.uid()
  );

CREATE POLICY "Providers can view own PTO"
  ON public.pto_requests FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can update own PTO"
  ON public.pto_requests FOR UPDATE TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Recruiters can view assigned provider PTO"
  ON public.pto_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'internal_staff')
    AND (
      recruiter_id = auth.uid()
      OR public.is_assigned_to(auth.uid(), provider_id)
    )
  );

CREATE POLICY "Admins can do everything on PTO"
  ON public.pto_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES: DOCUMENTS
-- ============================================================
CREATE POLICY "Users can view own uploaded docs"
  ON public.documents FOR SELECT TO authenticated
  USING (uploader_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Users can view org docs with matching role visibility"
  ON public.documents FOR SELECT TO authenticated
  USING (
    org_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (
      SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
    ) = ANY(role_visibility)
  );

CREATE POLICY "Admins can do everything on documents"
  ON public.documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Uploaders can delete own documents"
  ON public.documents FOR DELETE TO authenticated
  USING (uploader_id = auth.uid());

-- ============================================================
-- RLS POLICIES: AUDIT_LOG
-- ============================================================
CREATE POLICY "Only admins can read audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No direct insert policy - use log_audit() function instead

-- ============================================================
-- STORAGE: PRIVATE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('secure-documents', 'secure-documents', false);

-- Storage RLS: Only authenticated users can upload to their org folder
CREATE POLICY "Authenticated users can upload to their org folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'secure-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.organizations
      WHERE id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  );

-- Storage RLS: Users can view files in their org folder
CREATE POLICY "Users can view files in their org folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'secure-documents'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.organizations
        WHERE id IN (SELECT public.get_user_org_ids(auth.uid()))
      )
    )
  );

-- Storage RLS: Only uploaders and admins can delete
CREATE POLICY "Uploaders and admins can delete files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'secure-documents'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR auth.uid()::text = (storage.foldername(name))[2]
    )
  );

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_org_memberships_user_id ON public.org_memberships(user_id);
CREATE INDEX idx_org_memberships_org_id ON public.org_memberships(org_id);
CREATE INDEX idx_assignments_provider_id ON public.assignments(provider_id);
CREATE INDEX idx_assignments_recruiter_id ON public.assignments(recruiter_id);
CREATE INDEX idx_assignments_client_org_id ON public.assignments(client_org_id);
CREATE INDEX idx_pto_requests_provider_id ON public.pto_requests(provider_id);
CREATE INDEX idx_pto_requests_recruiter_id ON public.pto_requests(recruiter_id);
CREATE INDEX idx_pto_requests_dates ON public.pto_requests(start_date, end_date);
CREATE INDEX idx_documents_uploader_id ON public.documents(uploader_id);
CREATE INDEX idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX idx_documents_org_id ON public.documents(org_id);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);
