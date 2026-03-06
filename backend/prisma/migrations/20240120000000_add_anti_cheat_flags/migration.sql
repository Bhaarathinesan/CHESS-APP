-- CreateEnum
CREATE TYPE "anti_cheat_flag_type" AS ENUM ('fast_moves', 'tab_focus_loss', 'browser_extension', 'statistical_anomaly');

-- CreateEnum
CREATE TYPE "anti_cheat_flag_status" AS ENUM ('pending', 'reviewed', 'confirmed', 'dismissed');

-- CreateTable
CREATE TABLE "anti_cheat_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "game_id" UUID,
    "flag_type" "anti_cheat_flag_type" NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "details" JSONB NOT NULL DEFAULT '{}',
    "status" "anti_cheat_flag_status" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(6),
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anti_cheat_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anti_cheat_flags_user_id_idx" ON "anti_cheat_flags"("user_id");

-- CreateIndex
CREATE INDEX "anti_cheat_flags_game_id_idx" ON "anti_cheat_flags"("game_id");

-- CreateIndex
CREATE INDEX "anti_cheat_flags_status_idx" ON "anti_cheat_flags"("status");

-- CreateIndex
CREATE INDEX "anti_cheat_flags_flag_type_idx" ON "anti_cheat_flags"("flag_type");

-- CreateIndex
CREATE INDEX "anti_cheat_flags_created_at_idx" ON "anti_cheat_flags"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "anti_cheat_flags" ADD CONSTRAINT "anti_cheat_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anti_cheat_flags" ADD CONSTRAINT "anti_cheat_flags_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anti_cheat_flags" ADD CONSTRAINT "anti_cheat_flags_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
