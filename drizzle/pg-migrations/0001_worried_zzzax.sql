CREATE TABLE "assertions" (
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
CREATE TABLE "badge_classes" (
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
CREATE TABLE "issuers" (
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
ALTER TABLE "assertions" ADD CONSTRAINT "assertions_badge_class_id_badge_classes_id_fk" FOREIGN KEY ("badge_class_id") REFERENCES "public"."badge_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_classes" ADD CONSTRAINT "badge_classes_issuer_id_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assertion_badge_class_idx" ON "assertions" USING btree ("badge_class_id");--> statement-breakpoint
CREATE INDEX "assertion_issued_on_idx" ON "assertions" USING btree ("issued_on");--> statement-breakpoint
CREATE INDEX "assertion_revoked_idx" ON "assertions" USING btree ("revoked");--> statement-breakpoint
CREATE INDEX "assertion_expires_idx" ON "assertions" USING btree ("expires");--> statement-breakpoint
CREATE INDEX "badge_class_issuer_idx" ON "badge_classes" USING btree ("issuer_id");--> statement-breakpoint
CREATE INDEX "badge_class_name_idx" ON "badge_classes" USING btree ("name");--> statement-breakpoint
CREATE INDEX "badge_class_created_at_idx" ON "badge_classes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "issuer_name_idx" ON "issuers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "issuer_url_idx" ON "issuers" USING btree ("url");--> statement-breakpoint
CREATE INDEX "issuer_email_idx" ON "issuers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "issuer_created_at_idx" ON "issuers" USING btree ("created_at");