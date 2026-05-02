CREATE TABLE "results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"output" text,
	"scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"passed" boolean NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"suite_id" integer NOT NULL,
	"model" text NOT NULL,
	"prompt_hash" text NOT NULL,
	"prompt_text" text NOT NULL,
	"status" text NOT NULL,
	"git_sha" text,
	"git_branch" text,
	"triggered_by" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"notes" text,
	"is_baseline" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suites" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suites_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"suite_id" integer NOT NULL,
	"content_hash" text NOT NULL,
	"input" text NOT NULL,
	"expected" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_suite_id_suites_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."suites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_suite_id_suites_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."suites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "results_run_test_idx" ON "results" USING btree ("run_id","test_id");--> statement-breakpoint
CREATE INDEX "runs_suite_idx" ON "runs" USING btree ("suite_id");--> statement-breakpoint
CREATE INDEX "runs_started_idx" ON "runs" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tests_suite_hash_idx" ON "tests" USING btree ("suite_id","content_hash");