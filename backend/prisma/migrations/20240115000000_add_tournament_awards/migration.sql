-- CreateTable
CREATE TABLE "tournament_awards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournament_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "placement" INTEGER NOT NULL,
    "award_title" VARCHAR(100) NOT NULL,
    "award_description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournament_awards_tournament_id_idx" ON "tournament_awards"("tournament_id");

-- CreateIndex
CREATE INDEX "tournament_awards_user_id_idx" ON "tournament_awards"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_awards_tournament_id_user_id_key" ON "tournament_awards"("tournament_id", "user_id");

-- AddForeignKey
ALTER TABLE "tournament_awards" ADD CONSTRAINT "tournament_awards_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_awards" ADD CONSTRAINT "tournament_awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
