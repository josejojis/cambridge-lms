-- (Source of truth for RLS. PostgreSQL only.)
-- Row-level security: defence in depth for children's private learning records.
-- The API runs each request's data access as the restricted role `elite_app` (SET LOCAL ROLE)
-- with `app.user_id` set. The table owner (migrations, trusted jobs) is unaffected.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elite_app') THEN CREATE ROLE elite_app NOLOGIN; END IF;
END $$;

GRANT USAGE ON SCHEMA public TO elite_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO elite_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO elite_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO elite_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO elite_app;
-- The audit log is append-only for the application role.
REVOKE UPDATE, DELETE ON audit_logs FROM elite_app;

CREATE OR REPLACE FUNCTION app_user_id() RETURNS int LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.user_id', true), '')::int $$;

CREATE OR REPLACE FUNCTION app_bypass() RETURNS boolean LANGUAGE sql STABLE AS
$$ SELECT coalesce(current_setting('app.bypass_rls', true), 'off') = 'on' $$;

-- May the acting user see this learner's private records?
CREATE OR REPLACE FUNCTION app_can_view_learner(p_learner int) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_bypass()
      OR p_learner = app_user_id()
      OR EXISTS (SELECT 1 FROM parent_learner_relationships l
                  WHERE l.learner_id = p_learner AND l.parent_id = app_user_id() AND l.status = 'active')
      OR EXISTS (SELECT 1 FROM class_learners cl JOIN teacher_assignments ta ON ta.class_id = cl.class_id
                  WHERE cl.learner_id = p_learner AND ta.teacher_id = app_user_id())
      OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                  WHERE ur.user_id = app_user_id() AND r.slug = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION app_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_bypass() OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                                  WHERE ur.user_id = app_user_id() AND r.slug = 'super_admin')
$$;

-- Tables keyed directly by learner_id
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['lesson_progress','assessment_attempts','topic_performance','srs_cards','enrollments',
                           'bookmarks','progress_reports','certificates','class_learners','subscription_learners']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS learner_scope ON %I', t);
    EXECUTE format('CREATE POLICY learner_scope ON %I USING (app_can_view_learner(learner_id)) WITH CHECK (app_can_view_learner(learner_id))', t);
  END LOOP;
END $$;

ALTER TABLE learner_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS learner_scope ON learner_profiles;
CREATE POLICY learner_scope ON learner_profiles USING (app_can_view_learner(user_id)) WITH CHECK (app_can_view_learner(user_id));

-- Answers and results inherit visibility from their attempt
ALTER TABLE learner_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS via_attempt ON learner_answers;
CREATE POLICY via_attempt ON learner_answers USING (
  EXISTS (SELECT 1 FROM assessment_attempts a WHERE a.id = attempt_id AND app_can_view_learner(a.learner_id)));

ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS via_attempt ON assessment_results;
CREATE POLICY via_attempt ON assessment_results USING (
  EXISTS (SELECT 1 FROM assessment_attempts a WHERE a.id = attempt_id AND app_can_view_learner(a.learner_id)));

-- Personal: notifications and AI interaction logs belong to one user
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_rows ON notifications;
CREATE POLICY own_rows ON notifications USING (user_id = app_user_id() OR app_is_admin());

ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_rows ON ai_interactions;
CREATE POLICY own_rows ON ai_interactions USING (user_id = app_user_id() OR app_is_admin());

-- Money: the payer or an admin
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payer_scope ON payments;
CREATE POLICY payer_scope ON payments USING (payer_id = app_user_id() OR app_is_admin());

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payer_scope ON subscriptions;
CREATE POLICY payer_scope ON subscriptions USING (payer_id = app_user_id() OR app_is_admin()
  OR EXISTS (SELECT 1 FROM subscription_learners sl WHERE sl.subscription_id = subscriptions.id AND app_can_view_learner(sl.learner_id)));
