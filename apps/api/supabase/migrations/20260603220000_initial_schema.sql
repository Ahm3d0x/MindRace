-- ============================================================
-- Mind Race — Initial Database Schema Migration
-- Phase 1.2: Database Design
-- ============================================================
-- This migration creates all core tables, enums, indexes,
-- RLS policies, and triggers for the Mind Race platform.
-- ============================================================

-- ============================
-- 0. Extensions
-- ============================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================
-- 1. Custom Enum Types
-- ============================

-- User rank progression tiers
CREATE TYPE rank_tier AS ENUM (
  'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond',
  'Master', 'Grand Master', 'Legend', 'Mythic', 'Titan'
);

-- Question types matching @mind-race/shared QuestionType
CREATE TYPE question_type AS ENUM (
  'MULTIPLE_CHOICE', 'TRUE_FALSE', 'IMAGE_QUESTION',
  'ORDERING_QUESTION', 'MATCHING_QUESTION', 'FILL_IN_THE_BLANK',
  'MULTI_SELECT', 'CALCULATION_QUESTION', 'CIRCUIT_QUESTION',
  'CODING_QUESTION'
);

-- Question difficulty levels
CREATE TYPE difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');

-- Room visibility types
CREATE TYPE room_type AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY', 'SPECTATOR_ONLY');

-- Room / match lifecycle states
CREATE TYPE room_status AS ENUM ('WAITING', 'ACTIVE', 'ENDED');

-- Buzzer types matching @mind-race/shared BuzzerType
CREATE TYPE buzzer_type AS ENUM (
  'STANDARD', 'RISK', 'SAFE', 'COMPETITIVE', 'SUDDEN_DEATH',
  'TEAM_RELAY', 'CAPTAIN', 'HIDDEN', 'AUCTION',
  'TEAM_CONSULTATION', 'OPEN_DISCUSSION'
);

-- Game modes matching @mind-race/shared GameModeType
CREATE TYPE game_mode AS ENUM (
  'PRACTICE', 'TIMED_CHALLENGE', 'SURVIVAL',
  'DAILY_CHALLENGE', 'TEAM_BATTLE', 'FREE_FOR_ALL'
);

-- Power-up types matching @mind-race/shared PowerUpType
CREATE TYPE power_up_type AS ENUM (
  'JOKER', 'FREEZE', 'SHIELD', 'REVEAL_HINT', 'DOUBLE_CHANCE',
  'STEAL', 'TIME_BOOST', 'POINT_MULTIPLIER', 'CATEGORY_SWAP',
  'SKIP_QUESTION', 'BLOCK_POWER_UP'
);

-- Tournament bracket formats
CREATE TYPE tournament_format AS ENUM (
  'KNOCKOUT', 'DOUBLE_ELIMINATION', 'LEAGUE', 'SWISS'
);

-- Tournament lifecycle states
CREATE TYPE tournament_status AS ENUM (
  'REGISTRATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
);


-- ============================
-- 2. Utility: auto-update updated_at
-- ============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 3. TABLES
-- ============================================================

-- -----------------------------------------------------------
-- 3.1  profiles — extends auth.users with game-specific data
-- -----------------------------------------------------------
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  avatar_url    TEXT,
  rank          rank_tier NOT NULL DEFAULT 'Bronze',
  rank_points   INTEGER NOT NULL DEFAULT 0,
  coins         INTEGER NOT NULL DEFAULT 0,
  creator_tokens INTEGER NOT NULL DEFAULT 0,
  stats         JSONB NOT NULL DEFAULT '{
    "winRate": 0,
    "correctAnswersRate": 0,
    "bestCategory": null,
    "worstCategory": null,
    "averageAnswerTimeMs": 0,
    "fastestAnswerMs": 0,
    "tournamentCount": 0,
    "matchesPlayed": 0,
    "matchesWon": 0,
    "totalQuestionsAnswered": 0,
    "totalCorrectAnswers": 0
  }'::jsonb,
  is_teacher    BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  device_fingerprint TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE profiles IS 'Player profiles extending Supabase auth.users with game data (rank, coins, stats).';
COMMENT ON COLUMN profiles.stats IS 'JSONB matching @mind-race/shared UserStats interface.';
COMMENT ON COLUMN profiles.device_fingerprint IS 'Anti-cheat: device fingerprint captured at registration.';


-- -----------------------------------------------------------
-- 3.2  questions — question bank
-- -----------------------------------------------------------
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            question_type NOT NULL,
  category        TEXT NOT NULL,
  body            TEXT NOT NULL,
  image_url       TEXT,
  options         JSONB,            -- Array of { id, text, imageUrl? } for MCQ / multi-select
  correct_answer  JSONB,            -- String, string[], or structured answer depending on type
  ordering_items  JSONB,            -- Correct ordered sequence for ORDERING_QUESTION
  matching_pairs  JSONB,            -- Array of { leftId, leftText, rightId, rightText }
  coding_test_cases JSONB,          -- Array of { input, output } for CODING_QUESTION
  difficulty      difficulty_level NOT NULL DEFAULT 'Medium',
  rating          NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  rating_count    INTEGER NOT NULL DEFAULT 0,
  explanation     TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE questions IS 'Central question bank supporting 10 question types with flexible JSONB answer structures.';
COMMENT ON COLUMN questions.options IS 'MCQ/multi-select options as JSONB array: [{ "id": "a", "text": "Answer A" }]';
COMMENT ON COLUMN questions.correct_answer IS 'Polymorphic: string for single answer, array for multi-select, etc.';


-- -----------------------------------------------------------
-- 3.3  rooms — game lobbies
-- -----------------------------------------------------------
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,
  host_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        room_type NOT NULL DEFAULT 'PUBLIC',
  status      room_status NOT NULL DEFAULT 'WAITING',
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- config stores RoomConfig: { mode, maxPlayers, roundsCount, questionTimeLimitSeconds,
  --   buzzerType, allowedPowerUps, categoryWeights }
  current_round INTEGER NOT NULL DEFAULT 0,
  max_players   INTEGER NOT NULL DEFAULT 10,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE rooms IS 'Game lobbies where players gather before matches begin.';
COMMENT ON COLUMN rooms.code IS 'Short alphanumeric join code for private rooms.';
COMMENT ON COLUMN rooms.config IS 'JSONB matching @mind-race/shared RoomConfig interface.';


-- -----------------------------------------------------------
-- 3.4  room_participants — players currently in a room
-- -----------------------------------------------------------
CREATE TABLE room_participants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL DEFAULT 0,
  is_host     BOOLEAN NOT NULL DEFAULT FALSE,
  is_ready    BOOLEAN NOT NULL DEFAULT FALSE,
  team_id     TEXT,                 -- Null for non-team modes
  is_spectator BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(room_id, user_id)
);

COMMENT ON TABLE room_participants IS 'Junction table tracking which players are in which rooms.';


-- -----------------------------------------------------------
-- 3.5  matches — game sessions
-- -----------------------------------------------------------
CREATE TABLE matches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  mode          game_mode NOT NULL,
  total_rounds  INTEGER NOT NULL DEFAULT 10,
  status        room_status NOT NULL DEFAULT 'WAITING',
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Snapshot of room config at match start
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE matches IS 'A completed or in-progress game session within a room.';
COMMENT ON COLUMN matches.config IS 'Snapshot of room config frozen at match start time.';


-- -----------------------------------------------------------
-- 3.6  match_participants — per-player match stats
-- -----------------------------------------------------------
CREATE TABLE match_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id         TEXT,
  score           INTEGER NOT NULL DEFAULT 0,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  fastest_answer_ms INTEGER,
  is_mvp          BOOLEAN NOT NULL DEFAULT FALSE,
  rank_change     INTEGER NOT NULL DEFAULT 0,    -- +/- rank points awarded
  coins_earned    INTEGER NOT NULL DEFAULT 0,
  tokens_earned   INTEGER NOT NULL DEFAULT 0,

  UNIQUE(match_id, user_id)
);

COMMENT ON TABLE match_participants IS 'Per-player statistics and rewards for a specific match.';


-- -----------------------------------------------------------
-- 3.7  match_rounds — individual rounds within a match
-- -----------------------------------------------------------
CREATE TABLE match_rounds (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_number    INTEGER NOT NULL,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  buzzed_player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  buzz_time_ms    INTEGER,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,

  UNIQUE(match_id, round_number)
);

COMMENT ON TABLE match_rounds IS 'Each round of a match, linked to the question asked.';
COMMENT ON COLUMN match_rounds.buzzed_player_id IS 'First player to press the buzzer (null if no buzzer mode).';


-- -----------------------------------------------------------
-- 3.8  round_answers — per-player answers within a round
-- -----------------------------------------------------------
CREATE TABLE round_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id        UUID NOT NULL REFERENCES match_rounds(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answer          JSONB,              -- The submitted answer (flexible: string, array, object)
  time_spent_ms   INTEGER NOT NULL DEFAULT 0,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  points_earned   INTEGER NOT NULL DEFAULT 0,
  power_ups_used  JSONB DEFAULT '[]'::jsonb,  -- Array of power_up_type strings used this round
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(round_id, user_id)
);

COMMENT ON TABLE round_answers IS 'Individual answer submissions per player per round.';
COMMENT ON COLUMN round_answers.answer IS 'Polymorphic answer payload matching the question type.';


-- -----------------------------------------------------------
-- 3.9  badges — badge definitions (seeded)
-- -----------------------------------------------------------
CREATE TABLE badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT NOT NULL UNIQUE,       -- Machine-readable identifier e.g. 'speed_demon'
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url    TEXT,
  category    TEXT NOT NULL DEFAULT 'general',  -- e.g. 'achievement', 'milestone', 'seasonal'
  requirement JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Conditions to unlock, evaluated by app logic
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE badges IS 'Badge definitions — what badges exist and what they require.';
COMMENT ON COLUMN badges.requirement IS 'Machine-readable unlock conditions, e.g. {"type":"wins","count":50}';


-- -----------------------------------------------------------
-- 3.10  badges_earned — junction: user ↔ badge
-- -----------------------------------------------------------
CREATE TABLE badges_earned (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, badge_id)
);

COMMENT ON TABLE badges_earned IS 'Tracks which badges each player has unlocked.';


-- -----------------------------------------------------------
-- 3.11  seasons — seasonal content windows
-- -----------------------------------------------------------
CREATE TABLE seasons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  theme       TEXT,
  description TEXT,
  start_date  TIMESTAMPTZ NOT NULL,
  end_date    TIMESTAMPTZ NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  rewards     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Season-exclusive rewards
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (end_date > start_date)
);

CREATE TRIGGER set_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE seasons IS 'Seasonal content periods with exclusive badges, rewards, and rankings.';


-- -----------------------------------------------------------
-- 3.12  tournaments — tournament configurations
-- -----------------------------------------------------------
CREATE TABLE tournaments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  format          tournament_format NOT NULL DEFAULT 'KNOCKOUT',
  status          tournament_status NOT NULL DEFAULT 'REGISTRATION',
  bracket_size    INTEGER NOT NULL DEFAULT 8 CHECK (bracket_size IN (8, 16, 32, 64)),
  bracket         JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Full bracket structure
  max_team_size   INTEGER NOT NULL DEFAULT 1,
  entry_fee_coins INTEGER NOT NULL DEFAULT 0,
  entry_fee_tokens INTEGER NOT NULL DEFAULT 0,
  prize_pool      JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { "1st": {...}, "2nd": {...} }
  season_id       UUID REFERENCES seasons(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tournaments IS 'Tournament configurations with bracket management.';
COMMENT ON COLUMN tournaments.bracket IS 'JSONB bracket tree: [{ round, matchups: [{ team1, team2, winner }] }]';


-- -----------------------------------------------------------
-- 3.13  tournament_participants — junction: user ↔ tournament
-- -----------------------------------------------------------
CREATE TABLE tournament_participants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_name     TEXT,
  seed          INTEGER,              -- Seeding position
  is_eliminated BOOLEAN NOT NULL DEFAULT FALSE,
  wins          INTEGER NOT NULL DEFAULT 0,
  losses        INTEGER NOT NULL DEFAULT 0,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tournament_id, user_id)
);

COMMENT ON TABLE tournament_participants IS 'Players registered for a tournament with their progress.';


-- -----------------------------------------------------------
-- 3.14  tournament_matches — links matches to bracket rounds
-- -----------------------------------------------------------
CREATE TABLE tournament_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  bracket_round   INTEGER NOT NULL,     -- e.g. 1 = first round, 2 = quarter-finals, etc.
  bracket_position INTEGER NOT NULL,    -- Position within the round
  winner_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scheduled_at    TIMESTAMPTZ,

  UNIQUE(tournament_id, match_id)
);

COMMENT ON TABLE tournament_matches IS 'Maps game matches to their position in the tournament bracket.';


-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Profiles
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_rank ON profiles(rank);
CREATE INDEX idx_profiles_rank_points ON profiles(rank_points DESC);

-- Questions
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_category_difficulty ON questions(category, difficulty);
CREATE INDEX idx_questions_rating ON questions(rating DESC);

-- Rooms
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_host_id ON rooms(host_id);
CREATE INDEX idx_rooms_type_status ON rooms(type, status);
CREATE INDEX idx_rooms_code ON rooms(code);

-- Room participants
CREATE INDEX idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_room_participants_user_id ON room_participants(user_id);

-- Matches
CREATE INDEX idx_matches_room_id ON matches(room_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_room_status ON matches(room_id, status);
CREATE INDEX idx_matches_started_at ON matches(started_at DESC);

-- Match participants
CREATE INDEX idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX idx_match_participants_user_id ON match_participants(user_id);
CREATE INDEX idx_match_participants_score ON match_participants(score DESC);

-- Match rounds
CREATE INDEX idx_match_rounds_match_id ON match_rounds(match_id);
CREATE INDEX idx_match_rounds_question_id ON match_rounds(question_id);

-- Round answers
CREATE INDEX idx_round_answers_round_id ON round_answers(round_id);
CREATE INDEX idx_round_answers_user_id ON round_answers(user_id);

-- Badges earned
CREATE INDEX idx_badges_earned_user_id ON badges_earned(user_id);
CREATE INDEX idx_badges_earned_badge_id ON badges_earned(badge_id);

-- Seasons
CREATE INDEX idx_seasons_is_active ON seasons(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_seasons_dates ON seasons(start_date, end_date);

-- Tournaments
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_season_id ON tournaments(season_id);
CREATE INDEX idx_tournaments_starts_at ON tournaments(starts_at);

-- Tournament participants
CREATE INDEX idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_user_id ON tournament_participants(user_id);

-- Tournament matches
CREATE INDEX idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_match_id ON tournament_matches(match_id);


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all tables. Policies are initially permissive
-- and will be tightened in Phase 1.3 when auth context is available.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges_earned ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- ---- Profiles ----
-- Users can read all profiles (leaderboards, search)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profile insert happens on signup (handled by trigger or service role)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ---- Questions ----
-- All authenticated users can read questions
CREATE POLICY "questions_select_all"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- Only the creator (or admin via service role) can modify questions
CREATE POLICY "questions_insert_authenticated"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "questions_update_own"
  ON questions FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ---- Rooms ----
CREATE POLICY "rooms_select_all"
  ON rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rooms_insert_authenticated"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "rooms_update_host"
  ON rooms FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "rooms_delete_host"
  ON rooms FOR DELETE
  TO authenticated
  USING (host_id = auth.uid());

-- ---- Room Participants ----
CREATE POLICY "room_participants_select_all"
  ON room_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "room_participants_insert_self"
  ON room_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "room_participants_delete_self"
  ON room_participants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---- Matches ----
CREATE POLICY "matches_select_all"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "matches_insert_authenticated"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ---- Match Participants ----
CREATE POLICY "match_participants_select_all"
  ON match_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "match_participants_insert_self"
  ON match_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---- Match Rounds ----
CREATE POLICY "match_rounds_select_all"
  ON match_rounds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "match_rounds_insert_authenticated"
  ON match_rounds FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ---- Round Answers ----
CREATE POLICY "round_answers_select_all"
  ON round_answers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "round_answers_insert_self"
  ON round_answers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---- Badges (read-only for users, managed by service role) ----
CREATE POLICY "badges_select_all"
  ON badges FOR SELECT
  TO authenticated
  USING (true);

-- ---- Badges Earned ----
CREATE POLICY "badges_earned_select_all"
  ON badges_earned FOR SELECT
  TO authenticated
  USING (true);

-- Badge awarding is done server-side via service role

-- ---- Seasons (read-only) ----
CREATE POLICY "seasons_select_all"
  ON seasons FOR SELECT
  TO authenticated
  USING (true);

-- ---- Tournaments ----
CREATE POLICY "tournaments_select_all"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tournaments_insert_authenticated"
  ON tournaments FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ---- Tournament Participants ----
CREATE POLICY "tournament_participants_select_all"
  ON tournament_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tournament_participants_insert_self"
  ON tournament_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---- Tournament Matches ----
CREATE POLICY "tournament_matches_select_all"
  ON tournament_matches FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- 6. SEED DATA — Initial Badges
-- ============================================================
INSERT INTO badges (key, name, description, category, requirement) VALUES
  ('speed_demon',      'Speed Demon',      'Fastest answer time in a match',                    'achievement', '{"type": "fastest_in_match", "count": 1}'::jsonb),
  ('scientist',        'Scientist',         'Answer 1,000 science questions correctly',          'milestone',   '{"type": "category_answers", "category": "Science", "count": 1000}'::jsonb),
  ('historian',        'Historian',         'Answer 1,000 history questions correctly',          'milestone',   '{"type": "category_answers", "category": "History", "count": 1000}'::jsonb),
  ('undefeated',       'Undefeated',        'Win 50 consecutive matches',                        'achievement', '{"type": "consecutive_wins", "count": 50}'::jsonb),
  ('team_leader',      'Team Leader',       'Win 100 matches as team captain',                   'achievement', '{"type": "captain_wins", "count": 100}'::jsonb),
  ('tournament_king',  'Tournament King',   'Complete a full tournament without a single loss',   'achievement', '{"type": "tournament_undefeated", "count": 1}'::jsonb),
  ('first_win',        'First Victory',     'Win your first match',                              'milestone',   '{"type": "wins", "count": 1}'::jsonb),
  ('century',          'Century',           'Play 100 matches',                                  'milestone',   '{"type": "matches_played", "count": 100}'::jsonb),
  ('sharpshooter',     'Sharpshooter',      'Achieve 90%+ accuracy in a 20+ question match',     'achievement', '{"type": "accuracy_in_match", "accuracy": 0.9, "min_questions": 20}'::jsonb),
  ('survivor',         'Survivor',          'Reach level 50 in Survival Mode',                   'achievement', '{"type": "survival_level", "count": 50}'::jsonb),
  ('daily_devotee',    'Daily Devotee',     'Complete 30 daily challenges in a row',              'milestone',   '{"type": "daily_streak", "count": 30}'::jsonb),
  ('knowledge_titan',  'Knowledge Titan',   'Reach Titan rank',                                  'achievement', '{"type": "reach_rank", "rank": "Titan"}'::jsonb);


-- ============================================================
-- 7. Auto-create profile on user signup (Supabase Auth trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || LEFT(NEW.id::text, 8)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on Supabase auth.users to auto-create a profile row
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- Done! All tables, indexes, RLS policies, and seed data created.
-- ============================================================
