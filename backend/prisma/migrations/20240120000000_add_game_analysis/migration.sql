-- Add analysis data field to games table
-- Requirements: 15.2, 15.12

ALTER TABLE "games" ADD COLUMN "analysis_data" JSONB;

-- Add index for faster queries
CREATE INDEX "idx_games_analysis_data" ON "games" USING GIN ("analysis_data");

-- Add comment
COMMENT ON COLUMN "games"."analysis_data" IS 'Stockfish analysis results stored as JSON';
