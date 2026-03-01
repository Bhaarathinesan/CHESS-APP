-- Add chat settings to users table
ALTER TABLE "users" ADD COLUMN "chat_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "chat_disabled_games" TEXT[] NOT NULL DEFAULT '{}';

-- Create chat_reports table
CREATE TABLE "chat_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_reports_pkey" PRIMARY KEY ("id")
);

-- Create indexes for chat_reports
CREATE INDEX "chat_reports_message_id_idx" ON "chat_reports"("message_id");
CREATE INDEX "chat_reports_reporter_id_idx" ON "chat_reports"("reporter_id");
CREATE INDEX "chat_reports_status_idx" ON "chat_reports"("status");

-- Add foreign key constraint
ALTER TABLE "chat_reports" ADD CONSTRAINT "chat_reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
