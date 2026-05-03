ALTER TABLE "results" ALTER COLUMN "run_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "results" ALTER COLUMN "test_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "runs" ALTER COLUMN "suite_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "tests" ALTER COLUMN "suite_id" SET DATA TYPE bigint;