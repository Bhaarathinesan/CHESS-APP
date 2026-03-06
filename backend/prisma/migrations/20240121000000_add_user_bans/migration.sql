-- CreateEnum
CREATE TYPE "ban_type" AS ENUM ('warning', 'temporary', 'permanent');

-- CreateTable
CREATE TABLE "user_bans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ban_type" "ban_type" NOT NULL,
    "reason" TEXT NOT NULL,
    "expires_at" TIMESTAMP(6),
    "issued_by" UUID NOT NULL,
    "issued_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(6),
    "revoked_by" UUID,
    "revoke_reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_bans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_bans_user_id_idx" ON "user_bans"("user_id");

-- CreateIndex
CREATE INDEX "user_bans_issued_by_idx" ON "user_bans"("issued_by");

-- CreateIndex
CREATE INDEX "user_bans_is_active_idx" ON "user_bans"("is_active");

-- CreateIndex
CREATE INDEX "user_bans_issued_at_idx" ON "user_bans"("issued_at" DESC);

-- AddForeignKey
ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
