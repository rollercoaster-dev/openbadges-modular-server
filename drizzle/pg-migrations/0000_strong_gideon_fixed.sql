-- Create users table first to avoid circular references
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" varchar(50) NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" text,
  "first_name" varchar(50),
  "last_name" varchar(50),
  "roles" jsonb DEFAULT '[]' NOT NULL,
  "permissions" jsonb DEFAULT '[]' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_login" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_username_unique" UNIQUE("username"),
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint

-- Create roles table
CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "permissions" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint

-- Create API keys table
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "user_id" uuid NOT NULL,
  "description" text,
  "permissions" jsonb NOT NULL,
  "revoked" boolean DEFAULT false NOT NULL,
  "revoked_at" timestamp,
  "last_used" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint

-- Create issuers table
CREATE TABLE IF NOT EXISTS "issuers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "email" text,
  "description" text,
  "image" text,
  "public_key" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "additional_fields" jsonb
);
--> statement-breakpoint

-- Create badge_classes table
CREATE TABLE IF NOT EXISTS "badge_classes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "issuer_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "image" text NOT NULL,
  "criteria" jsonb NOT NULL,
  "alignment" jsonb,
  "tags" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "additional_fields" jsonb
);
--> statement-breakpoint

-- Create assertions table
CREATE TABLE IF NOT EXISTS "assertions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "badge_class_id" uuid NOT NULL,
  "recipient" jsonb NOT NULL,
  "issued_on" timestamp DEFAULT now() NOT NULL,
  "expires" timestamp,
  "evidence" jsonb,
  "verification" jsonb,
  "revoked" jsonb,
  "revocation_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "additional_fields" jsonb
);
--> statement-breakpoint

-- Create platforms table
CREATE TABLE IF NOT EXISTS "platforms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "client_id" text NOT NULL,
  "public_key" text NOT NULL,
  "webhook_url" text,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "platforms_name_unique" UNIQUE("name"),
  CONSTRAINT "platforms_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint

-- Create platform_users table
CREATE TABLE IF NOT EXISTS "platform_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "platform_id" uuid NOT NULL,
  "external_user_id" text NOT NULL,
  "display_name" text,
  "email" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Create user_assertions table
CREATE TABLE IF NOT EXISTS "user_assertions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "assertion_id" uuid NOT NULL,
  "added_at" timestamp DEFAULT now() NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "metadata" jsonb
);
--> statement-breakpoint

-- Create user_roles table
CREATE TABLE IF NOT EXISTS "user_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints after all tables are created
DO $$
BEGIN
  -- api_keys foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "api_keys"
      ADD CONSTRAINT "api_keys_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;

  -- badge_classes foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'badge_classes_issuer_id_issuers_id_fk'
  ) THEN
    ALTER TABLE "badge_classes"
      ADD CONSTRAINT "badge_classes_issuer_id_issuers_id_fk"
      FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;

  -- assertions foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assertions_badge_class_id_badge_classes_id_fk'
  ) THEN
    ALTER TABLE "assertions"
      ADD CONSTRAINT "assertions_badge_class_id_badge_classes_id_fk"
      FOREIGN KEY ("badge_class_id") REFERENCES "public"."badge_classes"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;

  -- platform_users foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_users_platform_id_platforms_id_fk'
  ) THEN
    ALTER TABLE "platform_users"
      ADD CONSTRAINT "platform_users_platform_id_platforms_id_fk"
      FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;

  -- user_assertions foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_assertions_user_id_platform_users_id_fk'
  ) THEN
    ALTER TABLE "user_assertions"
      ADD CONSTRAINT "user_assertions_user_id_platform_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."platform_users"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_assertions_assertion_id_assertions_id_fk'
  ) THEN
    ALTER TABLE "user_assertions"
      ADD CONSTRAINT "user_assertions_assertion_id_assertions_id_fk"
      FOREIGN KEY ("assertion_id") REFERENCES "public"."assertions"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;

  -- user_roles foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "user_roles"
      ADD CONSTRAINT "user_roles_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_role_id_roles_id_fk'
  ) THEN
    ALTER TABLE "user_roles"
      ADD CONSTRAINT "user_roles_role_id_roles_id_fk"
      FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint

-- Create indexes
DO $$
BEGIN
  -- api_keys indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'api_key_key_idx') THEN
    CREATE INDEX "api_key_key_idx" ON "api_keys" USING btree ("key");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'api_key_user_id_idx') THEN
    CREATE INDEX "api_key_user_id_idx" ON "api_keys" USING btree ("user_id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'api_key_revoked_idx') THEN
    CREATE INDEX "api_key_revoked_idx" ON "api_keys" USING btree ("revoked");
  END IF;

  -- assertions indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'assertion_badge_class_idx') THEN
    CREATE INDEX "assertion_badge_class_idx" ON "assertions" USING btree ("badge_class_id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'assertion_issued_on_idx') THEN
    CREATE INDEX "assertion_issued_on_idx" ON "assertions" USING btree ("issued_on");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'assertion_revoked_idx') THEN
    CREATE INDEX "assertion_revoked_idx" ON "assertions" USING btree ("revoked");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'assertion_expires_idx') THEN
    CREATE INDEX "assertion_expires_idx" ON "assertions" USING btree ("expires");
  END IF;

  -- badge_classes indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'badge_class_issuer_idx') THEN
    CREATE INDEX "badge_class_issuer_idx" ON "badge_classes" USING btree ("issuer_id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'badge_class_name_idx') THEN
    CREATE INDEX "badge_class_name_idx" ON "badge_classes" USING btree ("name");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'badge_class_created_at_idx') THEN
    CREATE INDEX "badge_class_created_at_idx" ON "badge_classes" USING btree ("created_at");
  END IF;

  -- issuers indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'issuer_name_idx') THEN
    CREATE INDEX "issuer_name_idx" ON "issuers" USING btree ("name");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'issuer_url_idx') THEN
    CREATE INDEX "issuer_url_idx" ON "issuers" USING btree ("url");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'issuer_email_idx') THEN
    CREATE INDEX "issuer_email_idx" ON "issuers" USING btree ("email");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'issuer_created_at_idx') THEN
    CREATE INDEX "issuer_created_at_idx" ON "issuers" USING btree ("created_at");
  END IF;

  -- platform_users indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'platform_user_idx') THEN
    CREATE INDEX "platform_user_idx" ON "platform_users" USING btree ("platform_id","external_user_id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'platform_user_email_idx') THEN
    CREATE INDEX "platform_user_email_idx" ON "platform_users" USING btree ("email");
  END IF;

  -- platforms indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'platform_name_idx') THEN
    CREATE INDEX "platform_name_idx" ON "platforms" USING btree ("name");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'platform_client_id_idx') THEN
    CREATE INDEX "platform_client_id_idx" ON "platforms" USING btree ("client_id");
  END IF;

  -- roles indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'role_name_idx') THEN
    CREATE INDEX "role_name_idx" ON "roles" USING btree ("name");
  END IF;

  -- user_assertions indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_assertion_idx') THEN
    CREATE INDEX "user_assertion_idx" ON "user_assertions" USING btree ("user_id","assertion_id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_assertion_added_at_idx') THEN
    CREATE INDEX "user_assertion_added_at_idx" ON "user_assertions" USING btree ("added_at");
  END IF;

  -- user_roles indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_role_user_id_idx') THEN
    CREATE INDEX "user_role_user_id_idx" ON "user_roles" USING btree ("user_id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_role_role_id_idx') THEN
    CREATE INDEX "user_role_role_id_idx" ON "user_roles" USING btree ("role_id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_role_user_id_role_id_idx') THEN
    CREATE INDEX "user_role_user_id_role_id_idx" ON "user_roles" USING btree ("user_id","role_id");
  END IF;

  -- users indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_username_idx') THEN
    CREATE INDEX "user_username_idx" ON "users" USING btree ("username");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_email_idx') THEN
    CREATE INDEX "user_email_idx" ON "users" USING btree ("email");
  END IF;
END
$$;
