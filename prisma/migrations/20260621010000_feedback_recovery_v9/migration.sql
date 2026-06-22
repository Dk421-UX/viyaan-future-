CREATE TABLE IF NOT EXISTS "feedback" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recovery_requests" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id" TEXT,
  "email" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recovery_requests_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feedback_user_id_fkey'
  ) THEN
    ALTER TABLE "feedback"
    ADD CONSTRAINT "feedback_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recovery_requests_user_id_fkey'
  ) THEN
    ALTER TABLE "recovery_requests"
    ADD CONSTRAINT "recovery_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "feedback_user_id_created_at_idx" ON "feedback"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "feedback_type_created_at_idx" ON "feedback"("type", "created_at");
CREATE INDEX IF NOT EXISTS "recovery_requests_email_created_at_idx" ON "recovery_requests"("email", "created_at");
CREATE INDEX IF NOT EXISTS "recovery_requests_status_created_at_idx" ON "recovery_requests"("status", "created_at");
