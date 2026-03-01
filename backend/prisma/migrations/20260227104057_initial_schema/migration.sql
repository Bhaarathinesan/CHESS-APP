-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('super_admin', 'tournament_admin', 'player', 'spectator');

-- CreateEnum
CREATE TYPE "time_control" AS ENUM ('bullet', 'blitz', 'rapid', 'classical');

-- CreateEnum
CREATE TYPE "game_status" AS ENUM ('pending', 'active', 'completed', 'aborted');

-- CreateEnum
CREATE TYPE "game_result" AS ENUM ('white_win', 'black_win', 'draw');

-- CreateEnum
CREATE TYPE "tournament_format" AS ENUM ('swiss', 'round_robin', 'single_elimination', 'double_elimination', 'arena');

-- CreateEnum
CREATE TYPE "tournament_status" AS ENUM ('created', 'registration_open', 'registration_closed', 'in_progress', 'round_in_progress', 'round_completed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "pairing_result" AS ENUM ('white_win', 'black_win', 'draw', 'bye');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255),
    "display_name" VARCHAR(100) NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "college_name" VARCHAR(255) NOT NULL,
    "college_domain" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'player',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" TEXT,
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMP(6),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" VARCHAR(255),
    "oauth_provider" VARCHAR(50),
    "oauth_id" VARCHAR(255),
    "theme_preference" VARCHAR(20) NOT NULL DEFAULT 'dark',
    "board_theme" VARCHAR(50) NOT NULL DEFAULT 'default',
    "piece_set" VARCHAR(50) NOT NULL DEFAULT 'default',
    "sound_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sound_volume" INTEGER NOT NULL DEFAULT 70,
    "notification_preferences" JSONB NOT NULL DEFAULT '{}',
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "last_online" TIMESTAMP(6),
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "ban_reason" TEXT,
    "ban_expires" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "time_control" "time_control" NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "peak_rating" INTEGER NOT NULL DEFAULT 1200,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "is_provisional" BOOLEAN NOT NULL DEFAULT true,
    "k_factor" INTEGER NOT NULL DEFAULT 40,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "time_control" "time_control" NOT NULL,
    "rating_before" INTEGER NOT NULL,
    "rating_after" INTEGER NOT NULL,
    "rating_change" INTEGER NOT NULL,
    "game_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rating_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "white_player_id" UUID NOT NULL,
    "black_player_id" UUID NOT NULL,
    "tournament_id" UUID,
    "time_control" "time_control" NOT NULL,
    "initial_time_minutes" INTEGER NOT NULL,
    "increment_seconds" INTEGER NOT NULL,
    "is_rated" BOOLEAN NOT NULL DEFAULT true,
    "status" "game_status" NOT NULL DEFAULT 'pending',
    "result" "game_result",
    "termination_reason" VARCHAR(50),
    "pgn" TEXT,
    "fen_current" VARCHAR(100) NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    "move_count" INTEGER NOT NULL DEFAULT 0,
    "white_time_remaining" INTEGER,
    "black_time_remaining" INTEGER,
    "white_rating_before" INTEGER,
    "black_rating_before" INTEGER,
    "white_rating_after" INTEGER,
    "black_rating_after" INTEGER,
    "opening_name" VARCHAR(255),
    "spectator_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_moves" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "move_number" INTEGER NOT NULL,
    "color" VARCHAR(5) NOT NULL,
    "san" VARCHAR(10) NOT NULL,
    "uci" VARCHAR(10) NOT NULL,
    "fen_after" VARCHAR(100) NOT NULL,
    "time_taken_ms" INTEGER NOT NULL,
    "time_remaining_ms" INTEGER NOT NULL,
    "is_check" BOOLEAN NOT NULL DEFAULT false,
    "is_checkmate" BOOLEAN NOT NULL DEFAULT false,
    "is_capture" BOOLEAN NOT NULL DEFAULT false,
    "is_castling" BOOLEAN NOT NULL DEFAULT false,
    "is_en_passant" BOOLEAN NOT NULL DEFAULT false,
    "is_promotion" BOOLEAN NOT NULL DEFAULT false,
    "promotion_piece" VARCHAR(10),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "banner_url" TEXT,
    "creator_id" UUID NOT NULL,
    "format" "tournament_format" NOT NULL,
    "time_control" "time_control" NOT NULL,
    "initial_time_minutes" INTEGER NOT NULL,
    "increment_seconds" INTEGER NOT NULL,
    "is_rated" BOOLEAN NOT NULL DEFAULT true,
    "status" "tournament_status" NOT NULL DEFAULT 'created',
    "min_players" INTEGER NOT NULL DEFAULT 4,
    "max_players" INTEGER NOT NULL DEFAULT 1000,
    "current_players" INTEGER NOT NULL DEFAULT 0,
    "rounds_total" INTEGER,
    "rounds_completed" INTEGER NOT NULL DEFAULT 0,
    "current_round" INTEGER NOT NULL DEFAULT 0,
    "pairing_method" VARCHAR(20) NOT NULL DEFAULT 'automatic',
    "tiebreak_criteria" VARCHAR(50) NOT NULL DEFAULT 'buchholz',
    "allow_late_registration" BOOLEAN NOT NULL DEFAULT false,
    "spectator_delay_seconds" INTEGER NOT NULL DEFAULT 0,
    "registration_deadline" TIMESTAMP(6) NOT NULL,
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6),
    "share_link" VARCHAR(255),
    "qr_code_url" TEXT,
    "prize_description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_players" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "score" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "buchholz_score" DECIMAL(6,2) NOT NULL DEFAULT 0.0,
    "sonneborn_berger" DECIMAL(6,2) NOT NULL DEFAULT 0.0,
    "rank" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "has_bye" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_pairings" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "round_number" INTEGER NOT NULL,
    "white_player_id" UUID,
    "black_player_id" UUID,
    "game_id" UUID,
    "result" "pairing_result",
    "board_number" INTEGER,
    "is_bye" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_pairings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "icon_url" TEXT,
    "category" VARCHAR(30) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "earned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link_url" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reported_user_id" UUID,
    "game_id" UUID,
    "report_type" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "is_spectator" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_college_domain_idx" ON "users"("college_domain");

-- CreateIndex
CREATE INDEX "users_is_online_idx" ON "users"("is_online");

-- CreateIndex
CREATE INDEX "users_oauth_provider_oauth_id_idx" ON "users"("oauth_provider", "oauth_id");

-- CreateIndex
CREATE INDEX "ratings_user_id_idx" ON "ratings"("user_id");

-- CreateIndex
CREATE INDEX "ratings_time_control_idx" ON "ratings"("time_control");

-- CreateIndex
CREATE INDEX "ratings_time_control_rating_idx" ON "ratings"("time_control", "rating" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ratings_user_id_time_control_key" ON "ratings"("user_id", "time_control");

-- CreateIndex
CREATE INDEX "rating_history_user_id_created_at_idx" ON "rating_history"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rating_history_game_id_idx" ON "rating_history"("game_id");

-- CreateIndex
CREATE INDEX "games_white_player_id_created_at_idx" ON "games"("white_player_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "games_black_player_id_created_at_idx" ON "games"("black_player_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "games_tournament_id_idx" ON "games"("tournament_id");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_time_control_idx" ON "games"("time_control");

-- CreateIndex
CREATE INDEX "games_created_at_idx" ON "games"("created_at" DESC);

-- CreateIndex
CREATE INDEX "game_moves_game_id_move_number_idx" ON "game_moves"("game_id", "move_number");

-- CreateIndex
CREATE UNIQUE INDEX "game_moves_game_id_move_number_color_key" ON "game_moves"("game_id", "move_number", "color");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_share_link_key" ON "tournaments"("share_link");

-- CreateIndex
CREATE INDEX "tournaments_creator_id_idx" ON "tournaments"("creator_id");

-- CreateIndex
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- CreateIndex
CREATE INDEX "tournaments_start_time_idx" ON "tournaments"("start_time");

-- CreateIndex
CREATE INDEX "tournaments_share_link_idx" ON "tournaments"("share_link");

-- CreateIndex
CREATE INDEX "tournament_players_tournament_id_score_idx" ON "tournament_players"("tournament_id", "score" DESC);

-- CreateIndex
CREATE INDEX "tournament_players_user_id_idx" ON "tournament_players"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_players_tournament_id_user_id_key" ON "tournament_players"("tournament_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_pairings_game_id_key" ON "tournament_pairings"("game_id");

-- CreateIndex
CREATE INDEX "tournament_pairings_tournament_id_round_number_idx" ON "tournament_pairings"("tournament_id", "round_number");

-- CreateIndex
CREATE INDEX "tournament_pairings_white_player_id_black_player_id_idx" ON "tournament_pairings"("white_player_id", "black_player_id");

-- CreateIndex
CREATE INDEX "tournament_pairings_game_id_idx" ON "tournament_pairings"("game_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE INDEX "achievements_code_idx" ON "achievements"("code");

-- CreateIndex
CREATE INDEX "achievements_category_idx" ON "achievements"("category");

-- CreateIndex
CREATE INDEX "user_achievements_user_id_earned_at_idx" ON "user_achievements"("user_id", "earned_at" DESC);

-- CreateIndex
CREATE INDEX "user_achievements_achievement_id_idx" ON "user_achievements"("achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read") WHERE ("is_read" = false);

-- CreateIndex
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "reports_reported_user_id_idx" ON "reports"("reported_user_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "chat_messages_game_id_created_at_idx" ON "chat_messages"("game_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_white_player_id_fkey" FOREIGN KEY ("white_player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_black_player_id_fkey" FOREIGN KEY ("black_player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_pairings" ADD CONSTRAINT "tournament_pairings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_pairings" ADD CONSTRAINT "tournament_pairings_white_player_id_fkey" FOREIGN KEY ("white_player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_pairings" ADD CONSTRAINT "tournament_pairings_black_player_id_fkey" FOREIGN KEY ("black_player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_pairings" ADD CONSTRAINT "tournament_pairings_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
