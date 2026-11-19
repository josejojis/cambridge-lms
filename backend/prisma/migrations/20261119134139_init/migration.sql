-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "public_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "password_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "email_verified_at" DATETIME,
    "last_login_at" DATETIME,
    "is_test_data" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- CreateTable
CREATE TABLE "roles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("user_id", "role_id"),
    CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    PRIMARY KEY ("role_id", "permission_id"),
    CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "learner_profiles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "curriculum_id" INTEGER,
    "level_id" INTEGER,
    "birth_year" INTEGER,
    "birth_month" INTEGER,
    "school_name" TEXT,
    CONSTRAINT "learner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "learner_profiles_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curricula" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "learner_profiles_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "academic_levels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teacher_profiles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "phone" TEXT,
    "bio" TEXT,
    "qualifications" TEXT,
    CONSTRAINT "teacher_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parent_profiles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "phone" TEXT,
    "notification_prefs" JSONB,
    CONSTRAINT "parent_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parent_learner_relationships" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parent_id" INTEGER NOT NULL,
    "learner_id" INTEGER NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'parent',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verified_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parent_learner_relationships_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parent_learner_relationships_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "consents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "subject_user_id" INTEGER,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "granted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" DATETIME,
    CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "consents_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "curricula" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "labels" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "academic_levels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "curriculum_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "academic_levels_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curricula" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "academic_levels_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "academic_levels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT
);

-- CreateTable
CREATE TABLE "curriculum_subjects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "curriculum_id" INTEGER NOT NULL,
    "level_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "syllabus_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "curriculum_subjects_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curricula" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "curriculum_subjects_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "academic_levels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "curriculum_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "units" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "curriculum_subject_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    CONSTRAINT "units_curriculum_subject_id_fkey" FOREIGN KEY ("curriculum_subject_id") REFERENCES "curriculum_subjects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "topics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unit_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    CONSTRAINT "topics_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "learning_objectives" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topic_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "learning_objectives_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "courses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "curriculum_subject_id" INTEGER NOT NULL,
    "author_id" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "courses_curriculum_subject_id_fkey" FOREIGN KEY ("curriculum_subject_id") REFERENCES "curriculum_subjects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "courses_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "course_id" INTEGER NOT NULL,
    "topic_id" INTEGER,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "estimated_minutes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lessons_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lesson_sections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lesson_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "media_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "lesson_sections_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "learning_resources" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lesson_id" INTEGER,
    "topic_id" INTEGER,
    "title" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "is_downloadable" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'published',
    CONSTRAINT "learning_resources_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "learning_resources_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "learner_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'subscription',
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolled_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enrollments_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "learner_id" INTEGER NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'started',
    "last_section_id" INTEGER,
    "seconds_spent" INTEGER NOT NULL DEFAULT 0,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    CONSTRAINT "lesson_progress_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lesson_progress_last_section_id_fkey" FOREIGN KEY ("last_section_id") REFERENCES "lesson_sections" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "learner_id" INTEGER NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "section_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookmarks_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookmarks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookmarks_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "lesson_sections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "classes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "curriculum_id" INTEGER NOT NULL,
    "level_id" INTEGER NOT NULL,
    "academic_year" TEXT NOT NULL,
    "school_name" TEXT,
    CONSTRAINT "classes_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curricula" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "classes_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "academic_levels" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "class_learners" (
    "class_id" INTEGER NOT NULL,
    "learner_id" INTEGER NOT NULL,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("class_id", "learner_id"),
    CONSTRAINT "class_learners_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "class_learners_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teacher_assignments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teacher_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "curriculum_subject_id" INTEGER NOT NULL,
    "can_create_assessments" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "teacher_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teacher_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teacher_assignments_curriculum_subject_id_fkey" FOREIGN KEY ("curriculum_subject_id") REFERENCES "curriculum_subjects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "question_banks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "curriculum_subject_id" INTEGER NOT NULL,
    "owner_id" INTEGER,
    "name" TEXT NOT NULL,
    CONSTRAINT "question_banks_curriculum_subject_id_fkey" FOREIGN KEY ("curriculum_subject_id") REFERENCES "curriculum_subjects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "question_banks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "questions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question_bank_id" INTEGER NOT NULL,
    "topic_id" INTEGER,
    "author_id" INTEGER,
    "type" TEXT NOT NULL,
    "stem_html" TEXT NOT NULL,
    "instructions" TEXT,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "explanation_html" TEXT,
    "answer_key" JSONB,
    "status" TEXT NOT NULL DEFAULT 'published',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_question_bank_id_fkey" FOREIGN KEY ("question_bank_id") REFERENCES "question_banks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "questions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question_id" INTEGER NOT NULL,
    "label_html" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "match_key" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "marking_schemes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question_id" INTEGER NOT NULL,
    "criteria" JSONB NOT NULL,
    "guidance_html" TEXT,
    CONSTRAINT "marking_schemes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "curriculum_subject_id" INTEGER NOT NULL,
    "class_id" INTEGER,
    "created_by_id" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "duration_minutes" INTEGER,
    "pass_mark_pct" INTEGER NOT NULL DEFAULT 50,
    "max_attempts" INTEGER,
    "shuffle_questions" BOOLEAN NOT NULL DEFAULT false,
    "random_pick_count" INTEGER,
    "opens_at" DATETIME,
    "closes_at" DATETIME,
    "results_release" TEXT NOT NULL DEFAULT 'immediate',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessments_curriculum_subject_id_fkey" FOREIGN KEY ("curriculum_subject_id") REFERENCES "curriculum_subjects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "assessments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "assessments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "assessment_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "marks_override" INTEGER,

    PRIMARY KEY ("assessment_id", "question_id"),
    CONSTRAINT "assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assessment_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "public_id" TEXT NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "learner_id" INTEGER NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline_at" DATETIME,
    "submitted_at" DATETIME,
    "question_order" JSONB,
    CONSTRAINT "assessment_attempts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assessment_attempts_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "learner_answers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "attempt_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "response" JSONB,
    "auto_score" REAL,
    "manual_score" REAL,
    "final_score" REAL,
    "feedback" TEXT,
    "marked_by_id" INTEGER,
    "marked_at" DATETIME,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "learner_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "learner_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "learner_answers_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "attempt_id" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "max_score" REAL NOT NULL,
    "percentage" REAL NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "released_at" DATETIME,
    "released_by_id" INTEGER,
    CONSTRAINT "assessment_results_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assessment_results_released_by_id_fkey" FOREIGN KEY ("released_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "topic_performance" (
    "learner_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "avg_pct" REAL NOT NULL,
    "last_pct" REAL NOT NULL,
    "updated_at" DATETIME NOT NULL,

    PRIMARY KEY ("learner_id", "topic_id"),
    CONSTRAINT "topic_performance_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "topic_performance_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "billing_period" TEXT NOT NULL,
    "period_days" INTEGER NOT NULL,
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "max_learners" INTEGER NOT NULL DEFAULT 1,
    "features" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "plan_entitlements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plan_id" INTEGER NOT NULL,
    "curriculum_subject_id" INTEGER,
    "course_id" INTEGER,
    "all_content" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "plan_entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "plan_entitlements_curriculum_subject_id_fkey" FOREIGN KEY ("curriculum_subject_id") REFERENCES "curriculum_subjects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "plan_entitlements_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "payer_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_start" DATETIME NOT NULL,
    "current_period_end" DATETIME NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscription_learners" (
    "subscription_id" INTEGER NOT NULL,
    "learner_id" INTEGER NOT NULL,

    PRIMARY KEY ("subscription_id", "learner_id"),
    CONSTRAINT "subscription_learners_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subscription_learners_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "public_id" TEXT NOT NULL,
    "subscription_id" INTEGER,
    "payer_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "merchant_reference" TEXT NOT NULL,
    "provider_reference" TEXT,
    "phone_masked" TEXT,
    "failure_reason" TEXT,
    "verified_at" DATETIME,
    "is_test_data" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_callbacks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "payment_id" INTEGER,
    "payload" JSONB NOT NULL,
    "signature_valid" BOOLEAN,
    "received_ip" TEXT,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME,
    CONSTRAINT "payment_callbacks_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "public_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "issued_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "author_id" INTEGER,
    "title" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "audience" JSONB NOT NULL,
    "published_at" DATETIME,
    "expires_at" DATETIME,
    CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requester_id" INTEGER NOT NULL,
    "assignee_id" INTEGER,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "support_ticket_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticket_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_ticket_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "progress_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "learner_id" INTEGER NOT NULL,
    "generated_by_id" INTEGER,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "data" JSONB NOT NULL,
    "file_path" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "progress_reports_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "progress_reports_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "public_id" TEXT NOT NULL,
    "learner_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "verification_code" TEXT NOT NULL,
    "issued_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "certificates_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actor_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_public_id_key" ON "users"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_slug_key" ON "permissions"("slug");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "learner_profiles_user_id_key" ON "learner_profiles"("user_id");

-- CreateIndex
CREATE INDEX "learner_profiles_curriculum_id_idx" ON "learner_profiles"("curriculum_id");

-- CreateIndex
CREATE INDEX "learner_profiles_level_id_idx" ON "learner_profiles"("level_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profiles_user_id_key" ON "teacher_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_profiles_user_id_key" ON "parent_profiles"("user_id");

-- CreateIndex
CREATE INDEX "parent_learner_relationships_learner_id_idx" ON "parent_learner_relationships"("learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_learner_relationships_parent_id_learner_id_key" ON "parent_learner_relationships"("parent_id", "learner_id");

-- CreateIndex
CREATE INDEX "consents_user_id_idx" ON "consents"("user_id");

-- CreateIndex
CREATE INDEX "consents_subject_user_id_idx" ON "consents"("subject_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "curricula_code_key" ON "curricula"("code");

-- CreateIndex
CREATE INDEX "academic_levels_parent_id_idx" ON "academic_levels"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_levels_curriculum_id_code_key" ON "academic_levels"("curriculum_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_slug_key" ON "subjects"("slug");

-- CreateIndex
CREATE INDEX "curriculum_subjects_curriculum_id_idx" ON "curriculum_subjects"("curriculum_id");

-- CreateIndex
CREATE INDEX "curriculum_subjects_subject_id_idx" ON "curriculum_subjects"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_subjects_level_id_subject_id_key" ON "curriculum_subjects"("level_id", "subject_id");

-- CreateIndex
CREATE INDEX "units_curriculum_subject_id_idx" ON "units"("curriculum_subject_id");

-- CreateIndex
CREATE INDEX "topics_unit_id_idx" ON "topics"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_objectives_topic_id_code_key" ON "learning_objectives"("topic_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_curriculum_subject_id_idx" ON "courses"("curriculum_subject_id");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "lessons_course_id_idx" ON "lessons"("course_id");

-- CreateIndex
CREATE INDEX "lessons_topic_id_idx" ON "lessons"("topic_id");

-- CreateIndex
CREATE INDEX "lesson_sections_lesson_id_idx" ON "lesson_sections"("lesson_id");

-- CreateIndex
CREATE INDEX "learning_resources_lesson_id_idx" ON "learning_resources"("lesson_id");

-- CreateIndex
CREATE INDEX "learning_resources_topic_id_idx" ON "learning_resources"("topic_id");

-- CreateIndex
CREATE INDEX "enrollments_course_id_idx" ON "enrollments"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_learner_id_course_id_key" ON "enrollments"("learner_id", "course_id");

-- CreateIndex
CREATE INDEX "lesson_progress_lesson_id_idx" ON "lesson_progress"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_learner_id_lesson_id_key" ON "lesson_progress"("learner_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_learner_id_lesson_id_section_id_key" ON "bookmarks"("learner_id", "lesson_id", "section_id");

-- CreateIndex
CREATE INDEX "classes_level_id_idx" ON "classes"("level_id");

-- CreateIndex
CREATE INDEX "class_learners_learner_id_idx" ON "class_learners"("learner_id");

-- CreateIndex
CREATE INDEX "teacher_assignments_class_id_idx" ON "teacher_assignments"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_assignments_teacher_id_class_id_curriculum_subject_id_key" ON "teacher_assignments"("teacher_id", "class_id", "curriculum_subject_id");

-- CreateIndex
CREATE INDEX "question_banks_curriculum_subject_id_idx" ON "question_banks"("curriculum_subject_id");

-- CreateIndex
CREATE INDEX "questions_question_bank_id_idx" ON "questions"("question_bank_id");

-- CreateIndex
CREATE INDEX "questions_topic_id_idx" ON "questions"("topic_id");

-- CreateIndex
CREATE INDEX "question_options_question_id_idx" ON "question_options"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "marking_schemes_question_id_key" ON "marking_schemes"("question_id");

-- CreateIndex
CREATE INDEX "assessments_curriculum_subject_id_idx" ON "assessments"("curriculum_subject_id");

-- CreateIndex
CREATE INDEX "assessments_class_id_idx" ON "assessments"("class_id");

-- CreateIndex
CREATE INDEX "assessment_questions_question_id_idx" ON "assessment_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_public_id_key" ON "assessment_attempts"("public_id");

-- CreateIndex
CREATE INDEX "assessment_attempts_learner_id_idx" ON "assessment_attempts"("learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_assessment_id_learner_id_attempt_no_key" ON "assessment_attempts"("assessment_id", "learner_id", "attempt_no");

-- CreateIndex
CREATE INDEX "learner_answers_question_id_idx" ON "learner_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "learner_answers_attempt_id_question_id_key" ON "learner_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_results_attempt_id_key" ON "assessment_results"("attempt_id");

-- CreateIndex
CREATE INDEX "topic_performance_topic_id_idx" ON "topic_performance"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE INDEX "plan_entitlements_plan_id_idx" ON "plan_entitlements"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_payer_id_idx" ON "subscriptions"("payer_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_current_period_end_idx" ON "subscriptions"("status", "current_period_end");

-- CreateIndex
CREATE INDEX "subscription_learners_learner_id_idx" ON "subscription_learners"("learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_public_id_key" ON "payments"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_merchant_reference_key" ON "payments"("merchant_reference");

-- CreateIndex
CREATE INDEX "payments_payer_id_idx" ON "payments"("payer_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_reference_key" ON "payments"("provider", "provider_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_callbacks_idempotency_key_key" ON "payment_callbacks"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_callbacks_payment_id_idx" ON "payment_callbacks"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_public_id_key" ON "invoices"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_payment_id_key" ON "invoices"("payment_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_ticket_messages_ticket_id_idx" ON "support_ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "progress_reports_learner_id_idx" ON "progress_reports"("learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_public_id_key" ON "certificates"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verification_code_key" ON "certificates"("verification_code");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_learner_id_course_id_key" ON "certificates"("learner_id", "course_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
