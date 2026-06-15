CREATE TABLE "analyst_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"cadence" text NOT NULL,
	"category" text NOT NULL,
	"completed_at" timestamp with time zone,
	"friction" text NOT NULL,
	"goal" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text NOT NULL,
	"stage" text NOT NULL,
	"tone" text NOT NULL,
	"volume" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyst_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"report_key" text NOT NULL,
	"question" text NOT NULL,
	"summary" text NOT NULL,
	"title" text NOT NULL,
	"window_label" text NOT NULL,
	"canvas_model" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "analyst_preferences" ADD CONSTRAINT "analyst_preferences_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyst_preferences_store_id_idx" ON "analyst_preferences" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "analyst_preferences_store_id_uidx" ON "analyst_preferences" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "saved_reports_store_id_idx" ON "saved_reports" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_reports_store_id_report_key_uidx" ON "saved_reports" USING btree ("store_id","report_key");--> statement-breakpoint
CREATE INDEX "saved_reports_updated_at_idx" ON "saved_reports" USING btree ("updated_at");--> statement-breakpoint
CREATE POLICY "analyst_preferences_service_role_select" ON "analyst_preferences" AS PERMISSIVE FOR SELECT TO "service_role" USING (true);--> statement-breakpoint
CREATE POLICY "analyst_preferences_service_role_insert" ON "analyst_preferences" AS PERMISSIVE FOR INSERT TO "service_role" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "analyst_preferences_service_role_update" ON "analyst_preferences" AS PERMISSIVE FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "analyst_preferences_service_role_delete" ON "analyst_preferences" AS PERMISSIVE FOR DELETE TO "service_role" USING (true);--> statement-breakpoint
CREATE POLICY "saved_reports_service_role_select" ON "saved_reports" AS PERMISSIVE FOR SELECT TO "service_role" USING (true);--> statement-breakpoint
CREATE POLICY "saved_reports_service_role_insert" ON "saved_reports" AS PERMISSIVE FOR INSERT TO "service_role" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "saved_reports_service_role_update" ON "saved_reports" AS PERMISSIVE FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "saved_reports_service_role_delete" ON "saved_reports" AS PERMISSIVE FOR DELETE TO "service_role" USING (true);