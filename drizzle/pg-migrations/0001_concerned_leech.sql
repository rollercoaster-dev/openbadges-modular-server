CREATE TABLE "credential_status_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_id" uuid NOT NULL,
	"status_list_id" uuid NOT NULL,
	"status_list_index" bigint NOT NULL,
	"status_size" smallint DEFAULT 1 NOT NULL,
	"purpose" text NOT NULL,
	"current_status" smallint DEFAULT 0 NOT NULL,
	"status_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuer_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"status_size" smallint DEFAULT 1 NOT NULL,
	"encoded_list" text NOT NULL,
	"ttl" bigint,
	"total_entries" integer DEFAULT 131072 NOT NULL,
	"used_entries" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assertions" ADD COLUMN "issuer_id" uuid;--> statement-breakpoint
ALTER TABLE "badge_classes" ADD COLUMN "version" text;--> statement-breakpoint
ALTER TABLE "badge_classes" ADD COLUMN "previous_version" uuid;--> statement-breakpoint
ALTER TABLE "badge_classes" ADD COLUMN "related" jsonb;--> statement-breakpoint
ALTER TABLE "badge_classes" ADD COLUMN "endorsement" jsonb;--> statement-breakpoint
ALTER TABLE "credential_status_entries" ADD CONSTRAINT "credential_status_entries_credential_id_assertions_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."assertions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_status_entries" ADD CONSTRAINT "credential_status_entries_status_list_id_status_lists_id_fk" FOREIGN KEY ("status_list_id") REFERENCES "public"."status_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_lists" ADD CONSTRAINT "status_lists_issuer_id_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credential_status_entries_credential_id_idx" ON "credential_status_entries" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "credential_status_entries_status_list_id_idx" ON "credential_status_entries" USING btree ("status_list_id");--> statement-breakpoint
CREATE INDEX "credential_status_entries_status_list_index_idx" ON "credential_status_entries" USING btree ("status_list_id","status_list_index");--> statement-breakpoint
CREATE INDEX "credential_status_entries_credential_purpose_unique" ON "credential_status_entries" USING btree ("credential_id","purpose");--> statement-breakpoint
CREATE INDEX "status_lists_issuer_id_idx" ON "status_lists" USING btree ("issuer_id");--> statement-breakpoint
CREATE INDEX "status_lists_purpose_idx" ON "status_lists" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "status_lists_issuer_purpose_idx" ON "status_lists" USING btree ("issuer_id","purpose");--> statement-breakpoint
ALTER TABLE "assertions" ADD CONSTRAINT "assertions_issuer_id_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_classes" ADD CONSTRAINT "badge_classes_previous_version_badge_classes_id_fk" FOREIGN KEY ("previous_version") REFERENCES "public"."badge_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assertion_issuer_idx" ON "assertions" USING btree ("issuer_id");--> statement-breakpoint
CREATE INDEX "badge_class_version_idx" ON "badge_classes" USING btree ("version");--> statement-breakpoint
CREATE INDEX "badge_class_previous_version_idx" ON "badge_classes" USING btree ("previous_version");--> statement-breakpoint
CREATE INDEX "badge_class_issuer_version_idx" ON "badge_classes" USING btree ("issuer_id","version");--> statement-breakpoint
CREATE INDEX "badge_class_related_gin_idx" ON "badge_classes" USING btree ("related");--> statement-breakpoint
CREATE INDEX "badge_class_endorsement_gin_idx" ON "badge_classes" USING btree ("endorsement");