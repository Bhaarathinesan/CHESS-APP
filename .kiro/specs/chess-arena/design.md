# Design Document: ChessArena Platform

## Overview

ChessArena is a full-stack online chess tournament platform built for college environments. The system enables real-time chess gameplay, tournament management, ELO rating tracking, and comprehensive player analytics. The platform follows a modern microservices-inspired architecture with clear separation between frontend, backend, real-time communication, and data persistence layers.

### Technology Stack

**Frontend:**
- Next.js 14 (App Router) - React framework with server-side rendering
- TypeScript - Type-safe development
- Tailwind CSS - Utility-first styling
- Zustand - Lightweight state management
- react-chessboard - Chess board UI component
- chess.js - Chess move validation and game logic
- Socket.IO Client - Real-time communication
- Stockfish WASM - Client-side chess analysis

**Backend:**
- NestJS - Progressive Node.js framework
- TypeScript - Type-safe development
- Prisma - Type-safe ORM
- PostgreSQL - Primary relational database
- Redis - Caching and session storage
- Socket.IO - WebSocket server for real-time features
- JWT - Authentication tokens
- bcrypt - Password hashing

**Infrastructure:**
- Docker - Containerization
- Cloudinary - Image storage and CDN
- SendGrid - Email service
- Vercel/AWS - Hosting platform

### Design Principles

1. **Real-time First**: All game interactions use WebSocket for sub-100ms latency
2. **Server Authority**: Game state and move validation always occur server-side
3. **Offline Resilience**: PWA capabilities enable offline viewing of past games
4. **Mobile Responsive**: Touch-optimized UI works seamlessly on all devices
5. **Type Safety**: End-to-end TypeScript ensures compile-time correctness
6. **Scalability**: Stateless services enable horizontal scaling
7. **Security**: Defense-in-depth with input validation, rate limiting, and anti-cheat measures

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  Mobile PWA  │  │ Native Apps  │          │
│  │  (Next.js)   │  │  (Next.js)   │  │ (React Native)│         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ HTTP/REST        │ WebSocket        │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                 │
└─────────────────────────────────────────────────────────────────┘
          │                                     │
          ▼                                     ▼
┌─────────────────────────┐         ┌─────────────────────────────┐
│   REST API Server       │         │   WebSocket Server          │
│   (NestJS)              │         │   (Socket.IO Gateway)       │
│                         │         │                             │
│  ┌──────────────────┐   │         │  ┌──────────────────┐      │
│  │ Auth Module      │   │         │  │ Game Gateway     │      │
│  │ User Module      │   │         │  │ Tournament GW    │      │
│  │ Game Module      │   │         │  │ Chat Gateway     │      │
│  │ Tournament Module│   │         │  │ Matchmaking GW   │      │
│  │ Rating Module    │   │         │  └──────────────────┘      │
│  │ Admin Module     │   │         │                             │
│  └──────────────────┘   │         └─────────────────────────────┘
└────────┬────────────────┘                     │
         │                                      │
         ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Chess Engine │  │ Rating Calc  │  │ Notification │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
         │                                      │
         ▼                                      ▼
┌─────────────────────────┐         ┌─────────────────────────────┐
│   PostgreSQL Database   │         │      Redis Cache            │
│   (Primary Data Store)  │         │   (Sessions, Queues)        │
└─────────────────────────┘         └─────────────────────────────┘
```

### Frontend Architecture (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx                 # Login page
│   ├── register/
│   │   └── page.tsx                 # Registration page
│   └── layout.tsx                   # Auth layout (centered, no nav)
├── (dashboard)/
│   ├── dashboard/
│   │   └── page.tsx                 # Main dashboard
│   ├── play/
│   │   ├── page.tsx                 # Game lobby/matchmaking
│   │   └── [gameId]/
│   │       └── page.tsx             # Active game view
│   ├── tournaments/
│   │   ├── page.tsx                 # Tournament list
│   │   ├── create/
│   │   │   └── page.tsx             # Create tournament
│   │   └── [tournamentId]/
│   │       ├── page.tsx             # Tournament details
│   │       └── standings/
│   │           └── page.tsx         # Tournament standings
│   ├── profile/
│   │   ├── [userId]/
│   │   │   └── page.tsx             # User profile view
│   │   └── settings/
│   │       └── page.tsx             # User settings
│   ├── leaderboard/
│   │   └── page.tsx                 # Global leaderboards
│   ├── history/
│   │   ├── page.tsx                 # Game history list
│   │   └── [gameId]/
│   │       └── page.tsx             # Game replay/analysis
│   └── layout.tsx                   # Dashboard layout (with nav)
├── (admin)/
│   ├── admin/
│   │   ├── page.tsx                 # Admin dashboard
│   │   ├── users/
│   │   │   └── page.tsx             # User management
│   │   ├── tournaments/
│   │   │   └── page.tsx             # Tournament management
│   │   └── reports/
│   │       └── page.tsx             # Moderation reports
│   └── layout.tsx                   # Admin layout
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts             # NextAuth API routes
└── layout.tsx                       # Root layout
```

### Backend Architecture (NestJS Modules)

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts           # Login, register, refresh endpoints
│   ├── auth.service.ts              # Authentication logic
│   ├── strategies/
│   │   ├── jwt.strategy.ts          # JWT validation
│   │   └── google.strategy.ts       # OAuth strategy
│   ├── guards/
│   │   ├── jwt-auth.guard.ts        # JWT guard
│   │   └── roles.guard.ts           # Role-based access
│   └── decorators/
│       └── roles.decorator.ts       # Role decorator
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts          # User CRUD endpoints
│   ├── users.service.ts             # User business logic
│   └── dto/
│       ├── create-user.dto.ts
│       └── update-user.dto.ts
├── games/
│   ├── games.module.ts
│   ├── games.controller.ts          # Game CRUD endpoints
│   ├── games.service.ts             # Game management
│   ├── chess-engine.service.ts      # Move validation
│   └── dto/
│       ├── create-game.dto.ts
│       └── make-move.dto.ts
├── tournaments/
│   ├── tournaments.module.ts
│   ├── tournaments.controller.ts    # Tournament CRUD
│   ├── tournaments.service.ts       # Tournament logic
│   ├── pairing.service.ts           # Pairing algorithms
│   └── dto/
│       ├── create-tournament.dto.ts
│       └── join-tournament.dto.ts
├── ratings/
│   ├── ratings.module.ts
│   ├── ratings.controller.ts        # Rating endpoints
│   ├── ratings.service.ts           # ELO calculations
│   └── dto/
│       └── rating-history.dto.ts
├── matchmaking/
│   ├── matchmaking.module.ts
│   ├── matchmaking.controller.ts    # Queue endpoints
│   ├── matchmaking.service.ts       # Pairing logic
│   └── matchmaking.gateway.ts       # WebSocket for queue
├── notifications/
│   ├── notifications.module.ts
│   ├── notifications.controller.ts  # Notification endpoints
│   ├── notifications.service.ts     # Notification logic
│   └── notifications.gateway.ts     # WebSocket push
├── admin/
│   ├── admin.module.ts
│   ├── admin.controller.ts          # Admin endpoints
│   └── admin.service.ts             # Admin operations
├── gateways/
│   ├── game.gateway.ts              # Game WebSocket events
│   ├── chat.gateway.ts              # Chat WebSocket events
│   └── tournament.gateway.ts        # Tournament WebSocket events
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts # Global error handler
│   ├── interceptors/
│   │   └── logging.interceptor.ts   # Request logging
│   ├── pipes/
│   │   └── validation.pipe.ts       # Input validation
│   └── decorators/
│       └── current-user.decorator.ts
└── prisma/
    ├── prisma.module.ts
    ├── prisma.service.ts            # Prisma client
    └── schema.prisma                # Database schema
```

### Real-Time Layer (Socket.IO)

The WebSocket layer handles all real-time communication through Socket.IO gateways:

**Game Gateway** (`/game` namespace):
- Handles move transmission
- Clock synchronization
- Draw offers and resignations
- Spectator connections

**Matchmaking Gateway** (`/matchmaking` namespace):
- Queue join/leave events
- Match found notifications
- Queue position updates

**Tournament Gateway** (`/tournament` namespace):
- Round start notifications
- Pairing announcements
- Live standings updates

**Chat Gateway** (`/chat` namespace):
- Game chat messages
- Typing indicators
- Spectator chat

**Notification Gateway** (`/notifications` namespace):
- Push notifications to clients
- Achievement unlocks
- System announcements

### Communication Flow

**REST API Flow:**
```
Client → HTTP Request → API Gateway → NestJS Controller → Service → Prisma → PostgreSQL
                                                                    ↓
                                                                  Redis (cache)
```

**WebSocket Flow:**
```
Client → WebSocket Event → Socket.IO Gateway → Service → Broadcast to Room
                                                  ↓
                                              Prisma → PostgreSQL (persist)
```

**Game Move Flow:**
```
Player A → move event → Game Gateway → Chess Engine Service (validate)
                                              ↓
                                         Valid? → Yes → Update DB
                                              ↓         ↓
                                         Broadcast ← ─ ┘
                                              ↓
                                    Player B + Spectators receive move
```

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    users    │────────<│    games    │>────────│  game_moves │
└─────────────┘         └─────────────┘         └─────────────┘
      │                       │
      │                       │
      ▼                       ▼
┌─────────────┐         ┌─────────────┐
│   ratings   │         │   follows   │
└─────────────┘         └─────────────┘
      │
      ▼
┌──────────────────┐
│  rating_history  │
└──────────────────┘

┌──────────────────┐         ┌──────────────────────┐
│   tournaments    │────────<│ tournament_players   │
└──────────────────┘         └──────────────────────┘
      │                              │
      │                              │
      ▼                              ▼
┌──────────────────────┐    ┌──────────────────┐
│ tournament_pairings  │    │  achievements    │
└──────────────────────┘    └──────────────────┘
                                     │
                                     ▼
                            ┌──────────────────────┐
                            │  user_achievements   │
                            └──────────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  notifications  │         │  chat_messages  │
└─────────────────┘         └─────────────────┘

┌─────────────────┐
│     reports     │
└─────────────────┘
```

### PostgreSQL Schema


#### Table: users

Stores all user account information, authentication credentials, and profile data.

```sql
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR(255) UNIQUE NOT NULL,
  username              VARCHAR(50) UNIQUE NOT NULL,
  password_hash         VARCHAR(255),              -- NULL for OAuth users
  display_name          VARCHAR(100) NOT NULL,
  avatar_url            TEXT,
  bio                   TEXT,
  country               VARCHAR(100),
  city                  VARCHAR(100),
  college_name          VARCHAR(255) NOT NULL,
  college_domain        VARCHAR(255) NOT NULL,
  role                  VARCHAR(20) NOT NULL DEFAULT 'player',  -- 'super_admin', 'tournament_admin', 'player', 'spectator'
  email_verified        BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  password_reset_token  TEXT,
  password_reset_expires TIMESTAMP,
  two_factor_enabled    BOOLEAN DEFAULT FALSE,
  two_factor_secret     VARCHAR(255),
  oauth_provider        VARCHAR(50),               -- 'google', NULL
  oauth_id              VARCHAR(255),
  theme_preference      VARCHAR(20) DEFAULT 'dark', -- 'dark', 'light'
  board_theme           VARCHAR(50) DEFAULT 'default',
  piece_set             VARCHAR(50) DEFAULT 'default',
  sound_enabled         BOOLEAN DEFAULT TRUE,
  sound_volume          INTEGER DEFAULT 70,        -- 0-100
  notification_preferences JSONB DEFAULT '{}',     -- Notification settings per type
  is_online             BOOLEAN DEFAULT FALSE,
  last_online           TIMESTAMP,
  is_banned             BOOLEAN DEFAULT FALSE,
  ban_reason            TEXT,
  ban_expires           TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_role CHECK (role IN ('super_admin', 'tournament_admin', 'player', 'spectator')),
  CONSTRAINT valid_theme CHECK (theme_preference IN ('dark', 'light')),
  CONSTRAINT valid_volume CHECK (sound_volume BETWEEN 0 AND 100)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_college_domain ON users(college_domain);
CREATE INDEX idx_users_is_online ON users(is_online);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
```

#### Table: ratings

Stores current ELO ratings for each user across different time controls.

```sql
CREATE TABLE ratings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_control      VARCHAR(20) NOT NULL,          -- 'bullet', 'blitz', 'rapid', 'classical'
  rating            INTEGER NOT NULL DEFAULT 1200,
  peak_rating       INTEGER NOT NULL DEFAULT 1200,
  games_played      INTEGER NOT NULL DEFAULT 0,
  wins              INTEGER NOT NULL DEFAULT 0,
  losses            INTEGER NOT NULL DEFAULT 0,
  draws             INTEGER NOT NULL DEFAULT 0,
  is_provisional    BOOLEAN DEFAULT TRUE,          -- TRUE if < 20 games
  k_factor          INTEGER NOT NULL DEFAULT 40,   -- 40, 20, or 10
  updated_at        TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, time_control),
  CONSTRAINT valid_time_control CHECK (time_control IN ('bullet', 'blitz', 'rapid', 'classical')),
  CONSTRAINT valid_rating CHECK (rating >= 100),
  CONSTRAINT valid_k_factor CHECK (k_factor IN (10, 20, 40))
);

CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_ratings_time_control ON ratings(time_control);
CREATE INDEX idx_ratings_rating ON ratings(time_control, rating DESC);
```

#### Table: rating_history

Tracks historical rating changes for analytics and graphs.

```sql
CREATE TABLE rating_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_control      VARCHAR(20) NOT NULL,
  rating_before     INTEGER NOT NULL,
  rating_after      INTEGER NOT NULL,
  rating_change     INTEGER NOT NULL,              -- Can be negative
  game_id           UUID REFERENCES games(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_time_control CHECK (time_control IN ('bullet', 'blitz', 'rapid', 'classical'))
);

CREATE INDEX idx_rating_history_user_id ON rating_history(user_id, created_at DESC);
CREATE INDEX idx_rating_history_game_id ON rating_history(game_id);
```

#### Table: games

Stores all chess games with complete move history and metadata.

```sql
CREATE TABLE games (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_player_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  black_player_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id         UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  time_control          VARCHAR(20) NOT NULL,
  initial_time_minutes  INTEGER NOT NULL,          -- Base time in minutes
  increment_seconds     INTEGER NOT NULL,          -- Increment per move
  is_rated              BOOLEAN DEFAULT TRUE,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'active', 'completed', 'aborted'
  result                VARCHAR(20),               -- 'white_win', 'black_win', 'draw', NULL
  termination_reason    VARCHAR(50),               -- 'checkmate', 'resignation', 'timeout', 'draw_agreement', etc.
  pgn                   TEXT,                      -- Complete game in PGN format
  fen_current           VARCHAR(100) DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  move_count            INTEGER DEFAULT 0,
  white_time_remaining  INTEGER,                   -- Milliseconds
  black_time_remaining  INTEGER,                   -- Milliseconds
  white_rating_before   INTEGER,
  black_rating_before   INTEGER,
  white_rating_after    INTEGER,
  black_rating_after    INTEGER,
  opening_name          VARCHAR(255),
  spectator_count       INTEGER DEFAULT 0,
  started_at            TIMESTAMP,
  completed_at          TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_time_control CHECK (time_control IN ('bullet', 'blitz', 'rapid', 'classical')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'completed', 'aborted')),
  CONSTRAINT valid_result CHECK (result IN ('white_win', 'black_win', 'draw') OR result IS NULL),
  CONSTRAINT different_players CHECK (white_player_id != black_player_id)
);

CREATE INDEX idx_games_white_player ON games(white_player_id, created_at DESC);
CREATE INDEX idx_games_black_player ON games(black_player_id, created_at DESC);
CREATE INDEX idx_games_tournament ON games(tournament_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_time_control ON games(time_control);
CREATE INDEX idx_games_created_at ON games(created_at DESC);
```

#### Table: game_moves

Stores individual moves for detailed analysis and replay.

```sql
CREATE TABLE game_moves (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id           UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_number       INTEGER NOT NULL,
  color             VARCHAR(5) NOT NULL,           -- 'white', 'black'
  san               VARCHAR(10) NOT NULL,          -- Standard Algebraic Notation
  uci               VARCHAR(10) NOT NULL,          -- Universal Chess Interface notation
  fen_after         VARCHAR(100) NOT NULL,
  time_taken_ms     INTEGER NOT NULL,              -- Time spent on this move
  time_remaining_ms INTEGER NOT NULL,              -- Time left after move
  is_check          BOOLEAN DEFAULT FALSE,
  is_checkmate      BOOLEAN DEFAULT FALSE,
  is_capture        BOOLEAN DEFAULT FALSE,
  is_castling       BOOLEAN DEFAULT FALSE,
  is_en_passant     BOOLEAN DEFAULT FALSE,
  is_promotion      BOOLEAN DEFAULT FALSE,
  promotion_piece   VARCHAR(10),                   -- 'queen', 'rook', 'bishop', 'knight'
  created_at        TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(game_id, move_number, color),
  CONSTRAINT valid_color CHECK (color IN ('white', 'black'))
);

CREATE INDEX idx_game_moves_game_id ON game_moves(game_id, move_number);
```

#### Table: tournaments

Stores tournament configurations and state.

```sql
CREATE TABLE tournaments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  banner_url            TEXT,
  creator_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  format                VARCHAR(30) NOT NULL,      -- 'swiss', 'round_robin', 'single_elimination', 'double_elimination', 'arena'
  time_control          VARCHAR(20) NOT NULL,
  initial_time_minutes  INTEGER NOT NULL,
  increment_seconds     INTEGER NOT NULL,
  is_rated              BOOLEAN DEFAULT TRUE,
  status                VARCHAR(30) NOT NULL DEFAULT 'created',  -- 'created', 'registration_open', 'registration_closed', 'in_progress', 'round_in_progress', 'round_completed', 'completed', 'cancelled'
  min_players           INTEGER NOT NULL DEFAULT 4,
  max_players           INTEGER NOT NULL DEFAULT 1000,
  current_players       INTEGER DEFAULT 0,
  rounds_total          INTEGER,                   -- For Swiss/Round Robin
  rounds_completed      INTEGER DEFAULT 0,
  current_round         INTEGER DEFAULT 0,
  pairing_method        VARCHAR(20) DEFAULT 'automatic',  -- 'automatic', 'manual'
  tiebreak_criteria     VARCHAR(50) DEFAULT 'buchholz',   -- 'buchholz', 'sonneborn_berger', 'direct_encounter'
  allow_late_registration BOOLEAN DEFAULT FALSE,
  spectator_delay_seconds INTEGER DEFAULT 0,
  registration_deadline TIMESTAMP NOT NULL,
  start_time            TIMESTAMP NOT NULL,
  end_time              TIMESTAMP,
  share_link            VARCHAR(255) UNIQUE,
  qr_code_url           TEXT,
  prize_description     TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_format CHECK (format IN ('swiss', 'round_robin', 'single_elimination', 'double_elimination', 'arena')),
  CONSTRAINT valid_time_control CHECK (time_control IN ('bullet', 'blitz', 'rapid', 'classical')),
  CONSTRAINT valid_status CHECK (status IN ('created', 'registration_open', 'registration_closed', 'in_progress', 'round_in_progress', 'round_completed', 'completed', 'cancelled')),
  CONSTRAINT valid_player_limits CHECK (min_players >= 2 AND max_players >= min_players AND max_players <= 1000)
);

CREATE INDEX idx_tournaments_creator ON tournaments(creator_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_start_time ON tournaments(start_time);
CREATE INDEX idx_tournaments_share_link ON tournaments(share_link);
```

#### Table: tournament_players

Tracks player participation and scores in tournaments.

```sql
CREATE TABLE tournament_players (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score             DECIMAL(4,1) DEFAULT 0.0,      -- Points (1 for win, 0.5 for draw, 0 for loss)
  wins              INTEGER DEFAULT 0,
  losses            INTEGER DEFAULT 0,
  draws             INTEGER DEFAULT 0,
  buchholz_score    DECIMAL(6,2) DEFAULT 0.0,      -- Tiebreak score
  sonneborn_berger  DECIMAL(6,2) DEFAULT 0.0,      -- Tiebreak score
  rank              INTEGER,
  is_active         BOOLEAN DEFAULT TRUE,
  has_bye           BOOLEAN DEFAULT FALSE,
  joined_at         TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_players_tournament ON tournament_players(tournament_id, score DESC);
CREATE INDEX idx_tournament_players_user ON tournament_players(user_id);
```

#### Table: tournament_pairings

Stores round pairings and results for tournaments.

```sql
CREATE TABLE tournament_pairings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number      INTEGER NOT NULL,
  white_player_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  black_player_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  game_id           UUID REFERENCES games(id) ON DELETE SET NULL,
  result            VARCHAR(20),                   -- 'white_win', 'black_win', 'draw', 'bye', NULL
  board_number      INTEGER,                       -- For display ordering
  is_bye            BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_result CHECK (result IN ('white_win', 'black_win', 'draw', 'bye') OR result IS NULL),
  CONSTRAINT bye_logic CHECK ((is_bye = TRUE AND black_player_id IS NULL) OR (is_bye = FALSE))
);

CREATE INDEX idx_tournament_pairings_tournament ON tournament_pairings(tournament_id, round_number);
CREATE INDEX idx_tournament_pairings_players ON tournament_pairings(white_player_id, black_player_id);
CREATE INDEX idx_tournament_pairings_game ON tournament_pairings(game_id);
```

#### Table: achievements

Defines all available achievements in the system.

```sql
CREATE TABLE achievements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(50) UNIQUE NOT NULL,   -- 'first_victory', 'checkmate_master', etc.
  name              VARCHAR(100) NOT NULL,
  description       TEXT NOT NULL,
  icon_url          TEXT,
  category          VARCHAR(30) NOT NULL,          -- 'gameplay', 'tournament', 'rating', 'social'
  points            INTEGER DEFAULT 0,
  is_hidden         BOOLEAN DEFAULT FALSE,         -- Hidden until unlocked
  created_at        TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_category CHECK (category IN ('gameplay', 'tournament', 'rating', 'social'))
);

CREATE INDEX idx_achievements_code ON achievements(code);
CREATE INDEX idx_achievements_category ON achievements(category);
```

#### Table: user_achievements

Tracks which achievements users have earned.

```sql
CREATE TABLE user_achievements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id    UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at         TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id, earned_at DESC);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);
```

#### Table: notifications

Stores all user notifications.

```sql
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(50) NOT NULL,          -- 'game_challenge', 'tournament_start', 'achievement', etc.
  title             VARCHAR(255) NOT NULL,
  message           TEXT NOT NULL,
  data              JSONB DEFAULT '{}',            -- Additional context data
  is_read           BOOLEAN DEFAULT FALSE,
  link_url          TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  read_at           TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

#### Table: follows

Tracks follower relationships between users.

```sql
CREATE TABLE follows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

#### Table: reports

Stores user reports for moderation.

```sql
CREATE TABLE reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  game_id           UUID REFERENCES games(id) ON DELETE SET NULL,
  report_type       VARCHAR(30) NOT NULL,          -- 'cheating', 'inappropriate_chat', 'harassment', 'other'
  description       TEXT NOT NULL,
  status            VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  admin_notes       TEXT,
  reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW(),
  reviewed_at       TIMESTAMP,
  
  CONSTRAINT valid_report_type CHECK (report_type IN ('cheating', 'inappropriate_chat', 'harassment', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'))
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
```

#### Table: chat_messages

Stores in-game chat messages.

```sql
CREATE TABLE chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id           UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message           TEXT NOT NULL,
  is_spectator      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT message_length CHECK (LENGTH(message) <= 200)
);

CREATE INDEX idx_chat_messages_game ON chat_messages(game_id, created_at);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
```

### Database Relationships Summary

- **users** → **ratings**: One-to-many (one user has multiple ratings per time control)
- **users** → **rating_history**: One-to-many (tracks all rating changes)
- **users** → **games**: Many-to-many (users play multiple games as white or black)
- **users** → **tournaments**: Many-to-many through **tournament_players**
- **users** → **follows**: Many-to-many self-referential (users follow users)
- **users** → **user_achievements**: Many-to-many through achievements
- **tournaments** → **tournament_players**: One-to-many
- **tournaments** → **tournament_pairings**: One-to-many
- **tournaments** → **games**: One-to-many (tournament games)
- **games** → **game_moves**: One-to-many
- **games** → **chat_messages**: One-to-many

### Indexes Strategy

- Primary keys on all tables (UUID)
- Foreign key indexes for join performance
- Composite indexes for common query patterns (user_id + created_at)
- Partial indexes for filtered queries (unread notifications)
- Descending indexes for time-based sorting

## API Design

### Authentication Endpoints


**POST /api/auth/register**
- Request: `{ email, username, password, displayName, collegeName, collegeDomain }`
- Response: `{ user, accessToken, refreshToken }`
- Validates email domain, hashes password, sends verification email

**POST /api/auth/login**
- Request: `{ email, password, rememberMe? }`
- Response: `{ user, accessToken, refreshToken }`
- Returns JWT with 24h or 30d expiration

**POST /api/auth/google**
- Request: `{ googleToken }`
- Response: `{ user, accessToken, refreshToken }`
- OAuth login/registration

**POST /api/auth/refresh**
- Request: `{ refreshToken }`
- Response: `{ accessToken, refreshToken }`
- Issues new access token

**POST /api/auth/logout**
- Request: `{ refreshToken }`
- Response: `{ success: true }`
- Invalidates refresh token

**POST /api/auth/forgot-password**
- Request: `{ email }`
- Response: `{ success: true }`
- Sends password reset email

**POST /api/auth/reset-password**
- Request: `{ token, newPassword }`
- Response: `{ success: true }`
- Resets password with valid token

**POST /api/auth/verify-email**
- Request: `{ token }`
- Response: `{ success: true }`
- Verifies email address

### User Endpoints

**GET /api/users/me**
- Response: `{ user, ratings, statistics }`
- Returns current authenticated user

**GET /api/users/:userId**
- Response: `{ user, ratings, recentGames, achievements }`
- Returns public profile

**PATCH /api/users/me**
- Request: `{ displayName?, bio?, country?, city?, avatarUrl? }`
- Response: `{ user }`
- Updates user profile

**PATCH /api/users/me/settings**
- Request: `{ theme?, boardTheme?, pieceSet?, soundEnabled?, soundVolume?, notificationPreferences? }`
- Response: `{ user }`
- Updates user preferences

**POST /api/users/me/avatar**
- Request: FormData with image file
- Response: `{ avatarUrl }`
- Uploads avatar to Cloudinary

**GET /api/users/:userId/stats**
- Response: `{ totalGames, winRate, ratingHistory, openingStats, performanceByTimeControl }`
- Returns detailed statistics

**GET /api/users/:userId/games**
- Query: `?page=1&limit=20&timeControl=blitz&result=win`
- Response: `{ games[], total, page, limit }`
- Returns paginated game history

**GET /api/users/search**
- Query: `?q=username&limit=10`
- Response: `{ users[] }`
- Searches users by username


### Game Endpoints

**POST /api/games**
- Request: `{ timeControl, initialTimeMinutes, incrementSeconds, isRated, opponentId? }`
- Response: `{ game }`
- Creates new game or challenge

**GET /api/games/:gameId**
- Response: `{ game, moves[], whitePlayer, blackPlayer }`
- Returns complete game data

**GET /api/games/:gameId/pgn**
- Response: PGN file download
- Exports game in PGN format

**POST /api/games/:gameId/analyze**
- Response: `{ analysis: { moves[], accuracy, mistakes[], blunders[], openingName } }`
- Triggers Stockfish analysis

**GET /api/games/active**
- Response: `{ games[] }`
- Returns user's active games

**GET /api/games/spectate**
- Query: `?timeControl=blitz&minRating=1800`
- Response: `{ games[] }`
- Returns spectatable games

**POST /api/games/:gameId/resign**
- Response: `{ game, result }`
- Resigns current game

**POST /api/games/:gameId/offer-draw**
- Response: `{ success: true }`
- Offers draw to opponent

**POST /api/games/:gameId/accept-draw**
- Response: `{ game, result }`
- Accepts draw offer

**POST /api/games/:gameId/decline-draw**
- Response: `{ success: true }`
- Declines draw offer

### Tournament Endpoints

**POST /api/tournaments**
- Request: `{ name, description, format, timeControl, initialTimeMinutes, incrementSeconds, minPlayers, maxPlayers, roundsTotal?, registrationDeadline, startTime, isRated }`
- Response: `{ tournament }`
- Creates tournament (requires tournament_admin role)

**GET /api/tournaments**
- Query: `?status=registration_open&page=1&limit=20`
- Response: `{ tournaments[], total, page, limit }`
- Lists tournaments with filters

**GET /api/tournaments/:tournamentId**
- Response: `{ tournament, players[], currentRound?, pairings[] }`
- Returns tournament details

**POST /api/tournaments/:tournamentId/join**
- Response: `{ tournamentPlayer }`
- Joins tournament

**DELETE /api/tournaments/:tournamentId/leave**
- Response: `{ success: true }`
- Leaves tournament (before start)

**POST /api/tournaments/:tournamentId/start**
- Response: `{ tournament }`
- Starts tournament (admin only)

**POST /api/tournaments/:tournamentId/cancel**
- Response: `{ tournament }`
- Cancels tournament (admin only)

**GET /api/tournaments/:tournamentId/standings**
- Response: `{ standings[] }`
- Returns current standings

**GET /api/tournaments/:tournamentId/pairings**
- Query: `?round=1`
- Response: `{ pairings[] }`
- Returns round pairings

**POST /api/tournaments/:tournamentId/pairings**
- Request: `{ roundNumber, pairings[] }`
- Response: `{ pairings[] }`
- Creates manual pairings (admin only)

**PATCH /api/tournaments/:tournamentId**
- Request: `{ name?, description?, bannerUrl? }`
- Response: `{ tournament }`
- Updates tournament (admin only)


### Matchmaking Endpoints

**POST /api/matchmaking/queue**
- Request: `{ timeControl, ratingRange? }`
- Response: `{ queueId, position }`
- Joins matchmaking queue

**DELETE /api/matchmaking/queue**
- Response: `{ success: true }`
- Leaves matchmaking queue

**GET /api/matchmaking/status**
- Response: `{ inQueue, position?, estimatedWaitTime? }`
- Returns queue status

### Rating Endpoints

**GET /api/ratings/:userId**
- Response: `{ ratings[] }`
- Returns all ratings for user

**GET /api/ratings/:userId/history**
- Query: `?timeControl=blitz&days=30`
- Response: `{ history[] }`
- Returns rating history

### Leaderboard Endpoints

**GET /api/leaderboards/:timeControl**
- Query: `?page=1&limit=100`
- Response: `{ leaderboard[], total }`
- Returns global leaderboard

**GET /api/leaderboards/:timeControl/college/:collegeDomain**
- Query: `?page=1&limit=100`
- Response: `{ leaderboard[], total }`
- Returns college-specific leaderboard

**GET /api/leaderboards/weekly**
- Query: `?timeControl=blitz`
- Response: `{ leaderboard[] }`
- Returns weekly top performers

### Notification Endpoints

**GET /api/notifications**
- Query: `?page=1&limit=20&unreadOnly=true`
- Response: `{ notifications[], total, unreadCount }`
- Returns user notifications

**PATCH /api/notifications/:notificationId/read**
- Response: `{ notification }`
- Marks notification as read

**PATCH /api/notifications/read-all**
- Response: `{ success: true }`
- Marks all notifications as read

**DELETE /api/notifications/:notificationId**
- Response: `{ success: true }`
- Deletes notification

### Social Endpoints

**POST /api/follows/:userId**
- Response: `{ follow }`
- Follows user

**DELETE /api/follows/:userId**
- Response: `{ success: true }`
- Unfollows user

**GET /api/follows/followers**
- Response: `{ followers[] }`
- Returns user's followers

**GET /api/follows/following**
- Response: `{ following[] }`
- Returns users being followed

**POST /api/blocks/:userId**
- Response: `{ success: true }`
- Blocks user

**DELETE /api/blocks/:userId**
- Response: `{ success: true }`
- Unblocks user


### Admin Endpoints

**GET /api/admin/dashboard**
- Response: `{ totalUsers, dailyActiveUsers, totalGames, serverMetrics }`
- Returns admin dashboard data (super_admin only)

**GET /api/admin/users**
- Query: `?search=username&page=1&limit=50`
- Response: `{ users[], total }`
- Lists all users (super_admin only)

**PATCH /api/admin/users/:userId**
- Request: `{ role?, isBanned?, banReason?, banExpires? }`
- Response: `{ user }`
- Updates user (super_admin only)

**POST /api/admin/users/:userId/reset-password**
- Response: `{ temporaryPassword }`
- Resets user password (super_admin only)

**GET /api/admin/reports**
- Query: `?status=pending&page=1&limit=50`
- Response: `{ reports[], total }`
- Lists moderation reports (super_admin only)

**PATCH /api/admin/reports/:reportId**
- Request: `{ status, adminNotes }`
- Response: `{ report }`
- Updates report status (super_admin only)

**POST /api/admin/announcements**
- Request: `{ title, message, priority }`
- Response: `{ announcement }`
- Creates platform announcement (super_admin only)

**GET /api/admin/logs**
- Query: `?level=error&page=1&limit=100`
- Response: `{ logs[], total }`
- Returns system logs (super_admin only)

**POST /api/admin/ratings/:userId/adjust**
- Request: `{ timeControl, newRating, reason }`
- Response: `{ rating }`
- Manually adjusts rating (super_admin only)

### Report Endpoints

**POST /api/reports**
- Request: `{ reportedUserId?, gameId?, reportType, description }`
- Response: `{ report }`
- Creates moderation report

**GET /api/reports/my-reports**
- Response: `{ reports[] }`
- Returns user's submitted reports

## WebSocket Events

### Game Events (Namespace: `/game`)

**Client → Server Events:**

```typescript
// Join game room
socket.emit('join_game', { gameId: string })

// Make move
socket.emit('make_move', { 
  gameId: string, 
  from: string,  // e.g., 'e2'
  to: string,    // e.g., 'e4'
  promotion?: 'q' | 'r' | 'b' | 'n'
})

// Offer draw
socket.emit('offer_draw', { gameId: string })

// Accept draw
socket.emit('accept_draw', { gameId: string })

// Decline draw
socket.emit('decline_draw', { gameId: string })

// Resign
socket.emit('resign', { gameId: string })

// Send chat message
socket.emit('game_chat', { gameId: string, message: string })

// Typing indicator
socket.emit('typing', { gameId: string })

// Leave game room
socket.emit('leave_game', { gameId: string })
```

**Server → Client Events:**

```typescript
// Game state update
socket.on('game_state', (data: {
  game: Game,
  moves: Move[],
  whiteTimeRemaining: number,
  blackTimeRemaining: number
}) => {})

// Move made
socket.on('move_made', (data: {
  move: Move,
  fen: string,
  san: string,
  whiteTimeRemaining: number,
  blackTimeRemaining: number,
  isCheck: boolean,
  isCheckmate: boolean
}) => {})

// Invalid move
socket.on('invalid_move', (data: {
  reason: string
}) => {})

// Draw offered
socket.on('draw_offered', (data: {
  offeredBy: string
}) => {})

// Draw accepted
socket.on('draw_accepted', () => {})

// Draw declined
socket.on('draw_declined', () => {})

// Game ended
socket.on('game_ended', (data: {
  result: 'white_win' | 'black_win' | 'draw',
  reason: string,
  whiteRatingChange?: number,
  blackRatingChange?: number
}) => {})

// Opponent disconnected
socket.on('opponent_disconnected', () => {})

// Opponent reconnected
socket.on('opponent_reconnected', () => {})

// Clock sync
socket.on('clock_sync', (data: {
  whiteTimeRemaining: number,
  blackTimeRemaining: number,
  serverTime: number
}) => {})

// Chat message received
socket.on('game_chat_message', (data: {
  senderId: string,
  senderName: string,
  message: string,
  timestamp: number
}) => {})

// Opponent typing
socket.on('opponent_typing', () => {})

// Spectator count update
socket.on('spectator_count', (data: { count: number }) => {})
```


### Matchmaking Events (Namespace: `/matchmaking`)

**Client → Server Events:**

```typescript
// Join queue
socket.emit('join_queue', { 
  timeControl: string,
  ratingRange?: number  // Default 200
})

// Leave queue
socket.emit('leave_queue', {})
```

**Server → Client Events:**

```typescript
// Queue joined
socket.on('queue_joined', (data: {
  queueId: string,
  position: number,
  estimatedWaitTime: number
}) => {})

// Queue position update
socket.on('queue_position', (data: {
  position: number,
  estimatedWaitTime: number
}) => {})

// Match found
socket.on('match_found', (data: {
  gameId: string,
  opponent: User,
  color: 'white' | 'black',
  timeControl: string
}) => {})

// Queue left
socket.on('queue_left', () => {})
```

### Tournament Events (Namespace: `/tournament`)

**Client → Server Events:**

```typescript
// Join tournament room
socket.emit('join_tournament', { tournamentId: string })

// Leave tournament room
socket.emit('leave_tournament', { tournamentId: string })
```

**Server → Client Events:**

```typescript
// Tournament started
socket.on('tournament_started', (data: {
  tournament: Tournament,
  currentRound: number
}) => {})

// Round started
socket.on('round_started', (data: {
  roundNumber: number,
  pairings: Pairing[]
}) => {})

// Pairing announced
socket.on('pairing_announced', (data: {
  pairing: Pairing,
  opponent: User,
  color: 'white' | 'black',
  gameId: string
}) => {})

// Round completed
socket.on('round_completed', (data: {
  roundNumber: number,
  standings: Standing[]
}) => {})

// Tournament completed
socket.on('tournament_completed', (data: {
  finalStandings: Standing[],
  winners: User[]
}) => {})

// Standings updated
socket.on('standings_updated', (data: {
  standings: Standing[]
}) => {})

// Tournament cancelled
socket.on('tournament_cancelled', (data: {
  reason: string
}) => {})
```

### Chat Events (Namespace: `/chat`)

**Client → Server Events:**

```typescript
// Send message
socket.emit('send_message', {
  gameId: string,
  message: string
})

// Typing indicator
socket.emit('typing', {
  gameId: string
})
```

**Server → Client Events:**

```typescript
// Message received
socket.on('message', (data: {
  messageId: string,
  senderId: string,
  senderName: string,
  message: string,
  timestamp: number
}) => {})

// User typing
socket.on('user_typing', (data: {
  userId: string,
  userName: string
}) => {})
```

### Notification Events (Namespace: `/notifications`)

**Client → Server Events:**

```typescript
// Connect to notification stream
socket.emit('subscribe_notifications', {})
```

**Server → Client Events:**

```typescript
// New notification
socket.on('notification', (data: {
  notification: Notification
}) => {})

// Achievement unlocked
socket.on('achievement_unlocked', (data: {
  achievement: Achievement
}) => {})

// Friend online
socket.on('friend_online', (data: {
  userId: string,
  userName: string
}) => {})

// Game challenge received
socket.on('challenge_received', (data: {
  challengeId: string,
  challenger: User,
  timeControl: string
}) => {})
```

### Connection Events (All Namespaces)

```typescript
// Connection established
socket.on('connect', () => {})

// Disconnection
socket.on('disconnect', (reason: string) => {})

// Reconnection attempt
socket.on('reconnect_attempt', (attemptNumber: number) => {})

// Reconnected
socket.on('reconnect', (attemptNumber: number) => {})

// Connection error
socket.on('connect_error', (error: Error) => {})
```

## Frontend Component Tree

### Page Components

```
app/
├── (auth)/
│   ├── login/page.tsx                    # LoginPage
│   └── register/page.tsx                 # RegisterPage
│
├── (dashboard)/
│   ├── dashboard/page.tsx                # DashboardPage
│   │   ├── QuickPlaySection
│   │   ├── ActiveTournamentsSection
│   │   ├── RecentGamesSection
│   │   ├── DailyPuzzleSection
│   │   └── NotificationsList
│   │
│   ├── play/
│   │   ├── page.tsx                      # PlayLobbyPage
│   │   │   ├── QuickPlayCard
│   │   │   ├── CreateGameCard
│   │   │   ├── ActiveGamesCard
│   │   │   └── OnlinePlayersCard
│   │   │
│   │   └── [gameId]/page.tsx             # GamePage
│   │       ├── ChessBoard
│   │       │   ├── Board (react-chessboard)
│   │       │   ├── PiecePromotionDialog
│   │       │   └── MoveHighlights
│   │       ├── GameSidebar
│   │       │   ├── PlayerCard (x2)
│   │       │   ├── ChessClock (x2)
│   │       │   ├── MoveList
│   │       │   ├── GameControls
│   │       │   │   ├── ResignButton
│   │       │   │   ├── OfferDrawButton
│   │       │   │   └── SettingsButton
│   │       │   └── GameChat
│   │       └── SpectatorBar
│   │
│   ├── tournaments/
│   │   ├── page.tsx                      # TournamentsListPage
│   │   │   ├── TournamentFilters
│   │   │   ├── TournamentCard (list)
│   │   │   └── CreateTournamentButton
│   │   │
│   │   ├── create/page.tsx               # CreateTournamentPage
│   │   │   └── TournamentForm
│   │   │       ├── BasicInfoSection
│   │   │       ├── TimeControlSection
│   │   │       ├── FormatSection
│   │   │       ├── SettingsSection
│   │   │       └── ScheduleSection
│   │   │
│   │   └── [tournamentId]/
│   │       ├── page.tsx                  # TournamentDetailsPage
│   │       │   ├── TournamentHeader
│   │       │   ├── TournamentTabs
│   │       │   │   ├── OverviewTab
│   │       │   │   ├── StandingsTab
│   │       │   │   ├── PairingsTab
│   │       │   │   └── GamesTab
│   │       │   ├── JoinTournamentButton
│   │       │   └── TournamentChat
│   │       │
│   │       └── standings/page.tsx        # TournamentStandingsPage
│   │           └── StandingsTable
│   │
│   ├── profile/
│   │   ├── [userId]/page.tsx             # ProfilePage
│   │   │   ├── ProfileHeader
│   │   │   │   ├── Avatar
│   │   │   │   ├── UserInfo
│   │   │   │   ├── RatingBadges
│   │   │   │   └── FollowButton
│   │   │   ├── ProfileTabs
│   │   │   │   ├── OverviewTab
│   │   │   │   │   ├── RatingChart
│   │   │   │   │   ├── StatisticsCards
│   │   │   │   │   └── AchievementsList
│   │   │   │   ├── GamesTab
│   │   │   │   │   └── GameHistoryList
│   │   │   │   ├── TournamentsTab
│   │   │   │   │   └── TournamentHistoryList
│   │   │   │   └── StatsTab
│   │   │   │       ├── PerformanceCharts
│   │   │   │       ├── OpeningStats
│   │   │   │       └── TimeManagementStats
│   │   │
│   │   └── settings/page.tsx             # SettingsPage
│   │       ├── SettingsTabs
│   │       │   ├── ProfileTab
│   │       │   ├── AppearanceTab
│   │       │   │   ├── ThemeSelector
│   │       │   │   ├── BoardThemeSelector
│   │       │   │   └── PieceSetSelector
│   │       │   ├── SoundTab
│   │       │   │   ├── VolumeSlider
│   │       │   │   └── SoundToggleList
│   │       │   ├── NotificationsTab
│   │       │   │   └── NotificationPreferences
│   │       │   └── SecurityTab
│   │       │       ├── ChangePasswordForm
│   │       │       └── TwoFactorSetup
│   │
│   ├── leaderboard/page.tsx              # LeaderboardPage
│   │   ├── TimeControlTabs
│   │   ├── LeaderboardFilters
│   │   └── LeaderboardTable
│   │
│   └── history/
│       ├── page.tsx                      # GameHistoryPage
│       │   ├── GameFilters
│       │   └── GameHistoryList
│       │
│       └── [gameId]/page.tsx             # GameReplayPage
│           ├── ChessBoard (replay mode)
│           ├── MoveNavigator
│           ├── AnalysisPanel
│           │   ├── EvaluationBar
│           │   ├── BestMovesSuggestion
│           │   ├── AccuracyChart
│           │   └── MistakesBlundersList
│           └── GameInfo
│
└── (admin)/
    └── admin/
        ├── page.tsx                      # AdminDashboardPage
        │   ├── MetricsCards
        │   ├── UsageCharts
        │   └── RecentActivityFeed
        │
        ├── users/page.tsx                # UserManagementPage
        │   ├── UserSearchBar
        │   ├── UserFilters
        │   └── UserTable
        │       └── UserActionsMenu
        │
        ├── tournaments/page.tsx          # TournamentManagementPage
        │   ├── TournamentFilters
        │   └── TournamentTable
        │       └── TournamentActionsMenu
        │
        └── reports/page.tsx              # ModerationPage
            ├── ReportFilters
            └── ReportsList
                └── ReportCard
                    ├── ReportDetails
                    └── ModerationActions
```


### Shared/Reusable Components

```
components/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Dialog.tsx
│   ├── Tabs.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Avatar.tsx
│   ├── Tooltip.tsx
│   ├── Dropdown.tsx
│   ├── Toast.tsx
│   ├── Skeleton.tsx
│   ├── Spinner.tsx
│   └── EmptyState.tsx
│
├── chess/
│   ├── ChessBoard.tsx                    # Main board component
│   ├── ChessPiece.tsx                    # Individual piece
│   ├── Square.tsx                        # Board square
│   ├── MoveList.tsx                      # Move history display
│   ├── ChessClock.tsx                    # Timer component
│   ├── PiecePromotionDialog.tsx          # Promotion selection
│   ├── EvaluationBar.tsx                 # Stockfish evaluation
│   └── CoordinateLabels.tsx              # Board coordinates
│
├── game/
│   ├── PlayerCard.tsx                    # Player info display
│   ├── GameControls.tsx                  # Game action buttons
│   ├── GameChat.tsx                      # In-game chat
│   ├── GameStatus.tsx                    # Status indicator
│   ├── MaterialDifference.tsx            # Captured pieces
│   └── SpectatorList.tsx                 # Spectator count/list
│
├── tournament/
│   ├── TournamentCard.tsx                # Tournament preview card
│   ├── TournamentBanner.tsx              # Tournament header
│   ├── StandingsTable.tsx                # Rankings table
│   ├── PairingsTable.tsx                 # Round pairings
│   ├── BracketView.tsx                   # Elimination bracket
│   └── TournamentTimer.tsx               # Countdown to start
│
├── profile/
│   ├── RatingBadge.tsx                   # Rating display
│   ├── RatingChart.tsx                   # Rating history graph
│   ├── StatCard.tsx                      # Statistic display
│   ├── AchievementBadge.tsx              # Achievement icon
│   └── GameHistoryItem.tsx               # Game list item
│
├── layout/
│   ├── Navbar.tsx                        # Top navigation
│   ├── Sidebar.tsx                       # Side navigation
│   ├── Footer.tsx                        # Footer
│   ├── MobileNav.tsx                     # Mobile bottom nav
│   └── Breadcrumbs.tsx                   # Breadcrumb navigation
│
└── common/
    ├── NotificationBell.tsx              # Notification icon
    ├── UserMenu.tsx                      # User dropdown
    ├── SearchBar.tsx                     # Global search
    ├── ThemeToggle.tsx                   # Dark/light toggle
    ├── LanguageSelector.tsx              # Language switcher
    └── LoadingScreen.tsx                 # Full-page loader
```

## State Management

### Zustand Store Structure

**Auth Store** (`stores/authStore.ts`):
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}
```

**Game Store** (`stores/gameStore.ts`):
```typescript
interface GameState {
  currentGame: Game | null;
  gameState: ChessGameState | null;
  moves: Move[];
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  isMyTurn: boolean;
  selectedSquare: string | null;
  legalMoves: string[];
  drawOffered: boolean;
  
  // Actions
  setGame: (game: Game) => void;
  makeMove: (from: string, to: string, promotion?: string) => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  resign: () => void;
  selectSquare: (square: string) => void;
  updateClock: (white: number, black: number) => void;
  reset: () => void;
}
```

**Tournament Store** (`stores/tournamentStore.ts`):
```typescript
interface TournamentState {
  currentTournament: Tournament | null;
  standings: Standing[];
  pairings: Pairing[];
  currentRound: number;
  myPairing: Pairing | null;
  
  // Actions
  setTournament: (tournament: Tournament) => void;
  updateStandings: (standings: Standing[]) => void;
  updatePairings: (pairings: Pairing[]) => void;
  joinTournament: (tournamentId: string) => Promise<void>;
  leaveTournament: (tournamentId: string) => Promise<void>;
  reset: () => void;
}
```

**Matchmaking Store** (`stores/matchmakingStore.ts`):
```typescript
interface MatchmakingState {
  inQueue: boolean;
  queuePosition: number | null;
  estimatedWaitTime: number | null;
  timeControl: string | null;
  
  // Actions
  joinQueue: (timeControl: string) => void;
  leaveQueue: () => void;
  updatePosition: (position: number, waitTime: number) => void;
  matchFound: (gameId: string) => void;
  reset: () => void;
}
```

**Notification Store** (`stores/notificationStore.ts`):
```typescript
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  fetchNotifications: () => Promise<void>;
}
```

**UI Store** (`stores/uiStore.ts`):
```typescript
interface UIState {
  theme: 'dark' | 'light';
  boardTheme: string;
  pieceSet: string;
  soundEnabled: boolean;
  soundVolume: number;
  sidebarOpen: boolean;
  modalOpen: string | null;
  
  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  setBoardTheme: (theme: string) => void;
  setPieceSet: (set: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}
```

**Socket Store** (`stores/socketStore.ts`):
```typescript
interface SocketState {
  gameSocket: Socket | null;
  matchmakingSocket: Socket | null;
  tournamentSocket: Socket | null;
  notificationSocket: Socket | null;
  isConnected: boolean;
  
  // Actions
  connectGameSocket: () => void;
  connectMatchmakingSocket: () => void;
  connectTournamentSocket: () => void;
  connectNotificationSocket: () => void;
  disconnectAll: () => void;
}
```

## Components and Interfaces

### Core Data Models

```typescript
// User model
interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  city?: string;
  collegeName: string;
  collegeDomain: string;
  role: 'super_admin' | 'tournament_admin' | 'player' | 'spectator';
  isOnline: boolean;
  lastOnline: Date;
  createdAt: Date;
}

// Game model
interface Game {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  tournamentId?: string;
  timeControl: 'bullet' | 'blitz' | 'rapid' | 'classical';
  initialTimeMinutes: number;
  incrementSeconds: number;
  isRated: boolean;
  status: 'pending' | 'active' | 'completed' | 'aborted';
  result?: 'white_win' | 'black_win' | 'draw';
  terminationReason?: string;
  pgn?: string;
  fenCurrent: string;
  moveCount: number;
  whiteTimeRemaining?: number;
  blackTimeRemaining?: number;
  whiteRatingBefore?: number;
  blackRatingBefore?: number;
  whiteRatingAfter?: number;
  blackRatingAfter?: number;
  openingName?: string;
  spectatorCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

// Move model
interface Move {
  id: string;
  gameId: string;
  moveNumber: number;
  color: 'white' | 'black';
  san: string;
  uci: string;
  fenAfter: string;
  timeTakenMs: number;
  timeRemainingMs: number;
  isCheck: boolean;
  isCheckmate: boolean;
  isCapture: boolean;
  isCastling: boolean;
  isEnPassant: boolean;
  isPromotion: boolean;
  promotionPiece?: string;
  createdAt: Date;
}

// Tournament model
interface Tournament {
  id: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  creatorId: string;
  format: 'swiss' | 'round_robin' | 'single_elimination' | 'double_elimination' | 'arena';
  timeControl: 'bullet' | 'blitz' | 'rapid' | 'classical';
  initialTimeMinutes: number;
  incrementSeconds: number;
  isRated: boolean;
  status: string;
  minPlayers: number;
  maxPlayers: number;
  currentPlayers: number;
  roundsTotal?: number;
  roundsCompleted: number;
  currentRound: number;
  pairingMethod: 'automatic' | 'manual';
  tiebreakCriteria: string;
  allowLateRegistration: boolean;
  spectatorDelaySeconds: number;
  registrationDeadline: Date;
  startTime: Date;
  endTime?: Date;
  shareLink: string;
  qrCodeUrl?: string;
  prizeDescription?: string;
  createdAt: Date;
}

// Rating model
interface Rating {
  id: string;
  userId: string;
  timeControl: 'bullet' | 'blitz' | 'rapid' | 'classical';
  rating: number;
  peakRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  isProvisional: boolean;
  kFactor: number;
  updatedAt: Date;
}

// Achievement model
interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: 'gameplay' | 'tournament' | 'rating' | 'social';
  points: number;
  isHidden: boolean;
  createdAt: Date;
}

// Notification model
interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  linkUrl?: string;
  createdAt: Date;
  readAt?: Date;
}
```


## Third-Party Integrations

### chess.js

**Purpose:** Chess move validation and game logic

**Usage:**
```typescript
import { Chess } from 'chess.js';

const chess = new Chess();

// Validate and make move
const move = chess.move({ from: 'e2', to: 'e4' });

// Check game state
const isCheck = chess.isCheck();
const isCheckmate = chess.isCheckmate();
const isStalemate = chess.isStalemate();
const isDraw = chess.isDraw();

// Get legal moves
const legalMoves = chess.moves({ square: 'e2' });

// Get FEN
const fen = chess.fen();

// Get PGN
const pgn = chess.pgn();

// Load position
chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
```

**Integration Points:**
- Client-side move validation before sending to server
- Server-side authoritative move validation
- PGN generation and parsing
- Legal move calculation for UI hints

### react-chessboard

**Purpose:** Chess board UI rendering

**Usage:**
```typescript
import { Chessboard } from 'react-chessboard';

<Chessboard
  position={fen}
  onPieceDrop={onDrop}
  boardOrientation={color}
  customBoardStyle={{
    borderRadius: '4px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
  }}
  customDarkSquareStyle={{ backgroundColor: '#779952' }}
  customLightSquareStyle={{ backgroundColor: '#edeed1' }}
  arePiecesDraggable={isMyTurn}
/>
```

**Integration Points:**
- Main game board rendering
- Drag-and-drop piece movement
- Board orientation (white/black perspective)
- Custom styling for themes

### Stockfish WASM

**Purpose:** Client-side chess engine for analysis

**Usage:**
```typescript
import { Chess } from 'chess.js';

// Initialize Stockfish
const stockfish = new Worker('/stockfish.js');

// Send position for analysis
stockfish.postMessage(`position fen ${fen}`);
stockfish.postMessage('go depth 20');

// Receive evaluation
stockfish.onmessage = (event) => {
  const message = event.data;
  if (message.includes('score cp')) {
    const score = parseScore(message);
    updateEvaluation(score);
  }
  if (message.includes('bestmove')) {
    const bestMove = parseBestMove(message);
    showBestMove(bestMove);
  }
};
```

**Integration Points:**
- Post-game analysis
- Move classification (brilliant, mistake, blunder)
- Best move suggestions
- Evaluation bar display

### Socket.IO

**Purpose:** Real-time bidirectional communication

**Client Setup:**
```typescript
import { io } from 'socket.io-client';

const gameSocket = io('http://localhost:3001/game', {
  auth: {
    token: accessToken
  },
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 3000
});

gameSocket.on('connect', () => {
  console.log('Connected to game server');
});

gameSocket.on('move_made', (data) => {
  updateGameState(data);
});
```

**Server Setup:**
```typescript
import { 
  WebSocketGateway, 
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/game' })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('make_move')
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MakeMoveDto
  ) {
    // Validate move
    const isValid = await this.chessEngine.validateMove(data);
    
    if (isValid) {
      // Broadcast to game room
      this.server.to(data.gameId).emit('move_made', {
        move: data,
        fen: newFen,
        san: san
      });
    } else {
      client.emit('invalid_move', { reason: 'Illegal move' });
    }
  }
}
```

**Integration Points:**
- Game move transmission
- Matchmaking queue updates
- Tournament notifications
- Chat messages
- Live notifications

### Prisma ORM

**Purpose:** Type-safe database access

**Schema Definition:**
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  username      String   @unique
  passwordHash  String?
  displayName   String
  avatarUrl     String?
  role          Role     @default(PLAYER)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  ratings       Rating[]
  gamesAsWhite  Game[]   @relation("WhitePlayer")
  gamesAsBlack  Game[]   @relation("BlackPlayer")
  tournaments   TournamentPlayer[]
  
  @@index([email])
  @@index([username])
}
```

**Usage:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create user
const user = await prisma.user.create({
  data: {
    email: 'user@college.edu',
    username: 'chessmaster',
    displayName: 'Chess Master',
    passwordHash: hashedPassword
  }
});

// Query with relations
const game = await prisma.game.findUnique({
  where: { id: gameId },
  include: {
    whitePlayer: true,
    blackPlayer: true,
    moves: {
      orderBy: { moveNumber: 'asc' }
    }
  }
});

// Update rating
await prisma.rating.update({
  where: { 
    userId_timeControl: {
      userId: userId,
      timeControl: 'blitz'
    }
  },
  data: {
    rating: newRating,
    gamesPlayed: { increment: 1 },
    wins: result === 'win' ? { increment: 1 } : undefined
  }
});
```

**Integration Points:**
- All database operations
- Type-safe queries
- Automatic migrations
- Relation loading

### Redis

**Purpose:** Caching and session storage

**Usage:**
```typescript
import { Redis } from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379
});

// Cache user session
await redis.setex(
  `session:${userId}`,
  86400, // 24 hours
  JSON.stringify(sessionData)
);

// Cache leaderboard
await redis.zadd(
  'leaderboard:blitz',
  rating,
  userId
);

// Get top 100
const topPlayers = await redis.zrevrange(
  'leaderboard:blitz',
  0,
  99,
  'WITHSCORES'
);

// Matchmaking queue
await redis.lpush('queue:blitz', userId);
const nextPlayer = await redis.rpop('queue:blitz');

// Rate limiting
const key = `ratelimit:${userId}:${endpoint}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 60); // 1 minute window
}
if (count > 100) {
  throw new TooManyRequestsException();
}
```

**Integration Points:**
- Session storage
- Leaderboard caching
- Matchmaking queues
- Rate limiting
- Real-time game state caching

### SendGrid

**Purpose:** Transactional email service

**Usage:**
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email verification
await sgMail.send({
  to: user.email,
  from: 'noreply@chessarena.com',
  subject: 'Verify your email',
  templateId: 'd-xxxxx',
  dynamicTemplateData: {
    userName: user.displayName,
    verificationLink: `https://chessarena.com/verify?token=${token}`
  }
});

// Tournament reminder
await sgMail.send({
  to: player.email,
  from: 'tournaments@chessarena.com',
  subject: `Tournament "${tournament.name}" starts in 1 hour`,
  templateId: 'd-yyyyy',
  dynamicTemplateData: {
    tournamentName: tournament.name,
    startTime: tournament.startTime,
    tournamentLink: `https://chessarena.com/tournaments/${tournament.id}`
  }
});
```

**Integration Points:**
- Email verification
- Password reset
- Tournament notifications
- Weekly summary emails
- Security alerts

### Cloudinary

**Purpose:** Image storage and CDN

**Usage:**
```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload avatar
const result = await cloudinary.uploader.upload(file.path, {
  folder: 'avatars',
  public_id: userId,
  overwrite: true,
  transformation: [
    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    { quality: 'auto' },
    { fetch_format: 'auto' }
  ]
});

const avatarUrl = result.secure_url;

// Upload tournament banner
const banner = await cloudinary.uploader.upload(file.path, {
  folder: 'tournament-banners',
  public_id: tournamentId,
  transformation: [
    { width: 1200, height: 400, crop: 'fill' },
    { quality: 'auto' }
  ]
});
```

**Integration Points:**
- User avatar uploads
- Tournament banner images
- Image optimization and transformation
- CDN delivery

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}
```

### HTTP Exception Filter

```typescript
import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  HttpException 
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: exceptionResponse['message'] || exception.message,
      error: exceptionResponse['error'] || 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      details: exceptionResponse['details']
    };

    response.status(status).json(errorResponse);
  }
}
```

### Common Error Types

```typescript
// 400 Bad Request
throw new BadRequestException('Invalid move format');

// 401 Unauthorized
throw new UnauthorizedException('Invalid credentials');

// 403 Forbidden
throw new ForbiddenException('Insufficient permissions');

// 404 Not Found
throw new NotFoundException('Game not found');

// 409 Conflict
throw new ConflictException('Username already exists');

// 429 Too Many Requests
throw new TooManyRequestsException('Rate limit exceeded');

// 500 Internal Server Error
throw new InternalServerErrorException('Database connection failed');
```

### WebSocket Error Handling

```typescript
@SubscribeMessage('make_move')
async handleMove(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: MakeMoveDto
) {
  try {
    // Validate and process move
    const result = await this.gameService.makeMove(data);
    this.server.to(data.gameId).emit('move_made', result);
  } catch (error) {
    client.emit('error', {
      event: 'make_move',
      message: error.message,
      code: error.code
    });
  }
}
```

### Client-Side Error Handling

```typescript
// API error handling
try {
  const response = await fetch('/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gameData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  const game = await response.json();
  return game;
} catch (error) {
  toast.error(error.message);
  console.error('Failed to create game:', error);
}

// WebSocket error handling
socket.on('error', (error) => {
  console.error('Socket error:', error);
  toast.error(error.message);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  toast.error('Failed to connect to game server');
});
```

## Testing Strategy

The ChessArena platform requires comprehensive testing across multiple layers to ensure correctness, reliability, and performance. We employ a dual testing approach combining traditional unit/integration tests with property-based testing.

### Testing Layers

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test API endpoints and service interactions
3. **Property-Based Tests**: Test universal properties across randomized inputs
4. **End-to-End Tests**: Test complete user workflows
5. **Load Tests**: Test system performance under concurrent load

### Unit Testing

**Chess Engine Tests:**
```typescript
describe('ChessEngineService', () => {
  describe('validateMove', () => {
    it('should accept valid pawn move', () => {
      const isValid = chessEngine.validateMove({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        from: 'e2',
        to: 'e4'
      });
      expect(isValid).toBe(true);
    });

    it('should reject invalid knight move', () => {
      const isValid = chessEngine.validateMove({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        from: 'b1',
        to: 'c2'
      });
      expect(isValid).toBe(false);
    });

    it('should allow castling when conditions met', () => {
      const isValid = chessEngine.validateMove({
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
        from: 'e1',
        to: 'g1'
      });
      expect(isValid).toBe(true);
    });

    it('should prevent castling through check', () => {
      const isValid = chessEngine.validateMove({
        fen: 'r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1',
        from: 'e1',
        to: 'g1'
      });
      expect(isValid).toBe(false);
    });
  });

  describe('detectCheckmate', () => {
    it('should detect back rank mate', () => {
      const isCheckmate = chessEngine.isCheckmate(
        'r5rk/5Qpp/8/8/8/8/8/7K b - - 0 1'
      );
      expect(isCheckmate).toBe(true);
    });

    it('should not detect checkmate when escape exists', () => {
      const isCheckmate = chessEngine.isCheckmate(
        'r5rk/5Qpp/8/8/8/8/8/6K1 b - - 0 1'
      );
      expect(isCheckmate).toBe(false);
    });
  });
});
```

**Rating Calculation Tests:**
```typescript
describe('RatingService', () => {
  describe('calculateEloChange', () => {
    it('should calculate correct rating change for equal players', () => {
      const change = ratingService.calculateEloChange({
        playerRating: 1500,
        opponentRating: 1500,
        kFactor: 20,
        result: 1 // win
      });
      expect(change).toBe(10); // Expected score 0.5, actual 1, diff 0.5 * 20
    });

    it('should give larger gain for upset victory', () => {
      const change = ratingService.calculateEloChange({
        playerRating: 1400,
        opponentRating: 1600,
        kFactor: 20,
        result: 1
      });
      expect(change).toBeGreaterThan(15);
    });

    it('should use correct K-factor for provisional players', () => {
      const player = { rating: 1200, gamesPlayed: 15 };
      const kFactor = ratingService.getKFactor(player);
      expect(kFactor).toBe(40);
    });
  });
});
```


### Integration Testing

**API Endpoint Tests:**
```typescript
describe('GameController (e2e)', () => {
  it('POST /api/games should create new game', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/games')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        timeControl: 'blitz',
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('pending');
  });

  it('GET /api/games/:id should return game with moves', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/games/${gameId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('moves');
    expect(response.body).toHaveProperty('whitePlayer');
    expect(response.body).toHaveProperty('blackPlayer');
  });
});
```

**WebSocket Integration Tests:**
```typescript
describe('GameGateway (e2e)', () => {
  let socket: Socket;

  beforeEach(() => {
    socket = io('http://localhost:3001/game', {
      auth: { token: accessToken }
    });
  });

  it('should broadcast move to both players', (done) => {
    socket.emit('join_game', { gameId });
    
    socket.on('move_made', (data) => {
      expect(data.move.from).toBe('e2');
      expect(data.move.to).toBe('e4');
      done();
    });

    socket.emit('make_move', {
      gameId,
      from: 'e2',
      to: 'e4'
    });
  });
});
```

### Property-Based Testing

Property-based testing validates universal properties across many randomized inputs. We use **fast-check** library for TypeScript/JavaScript.

**Installation:**
```bash
npm install --save-dev fast-check
```

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tests reference design document properties


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Email Verification Sent on Registration

*For any* user registration with email and password, the system should send an email verification link to the provided email address.

**Validates: Requirements 1.3**

### Property 2: College Domain Validation

*For any* email address provided during registration, the system should accept it only if the domain matches an approved college domain list.

**Validates: Requirements 1.4**

### Property 3: Password Hashing with Bcrypt

*For any* password stored in the database, it should be hashed using bcrypt with at least 10 salt rounds, and the stored value should never be the plaintext password.

**Validates: Requirements 1.5**

### Property 4: Password Reset Link Expiration

*For any* password reset request, the generated reset link should expire exactly 1 hour after creation.

**Validates: Requirements 1.6**

### Property 5: JWT Token Expiration

*For any* successful authentication without "Remember Me", the issued JWT token should have an expiration time of exactly 24 hours from issuance.

**Validates: Requirements 1.7**

### Property 6: Extended Session with Remember Me

*For any* successful authentication with "Remember Me" enabled, the issued JWT token should have an expiration time of exactly 30 days from issuance.

**Validates: Requirements 1.8**

### Property 7: King Movement Validation

*For any* King move attempt, the move should be valid only if it moves exactly one square in any direction (horizontal, vertical, or diagonal) and does not move into check.

**Validates: Requirements 2.1**

### Property 8: Piece Movement Through Blocking

*For any* piece move attempt (except Knight), the move should be invalid if any piece occupies a square between the starting and ending positions.

**Validates: Requirements 2.9**

### Property 9: Dual-Side Move Validation

*For any* move attempt, both client-side and server-side validation should produce the same result (valid or invalid).

**Validates: Requirements 2.11**

### Property 10: Castling Legality

*For any* castling attempt, the move should be valid only if: (1) the King has not moved, (2) the Rook has not moved, (3) no pieces occupy squares between them, (4) the King is not in check, (5) the King does not pass through check, and (6) the King does not end in check.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

### Property 11: En Passant Timing

*For any* en passant capture attempt, the move should be valid only if it occurs immediately after the opponent's pawn moves two squares forward and lands adjacent to the capturing pawn.

**Validates: Requirements 3.9**

### Property 12: Pawn Promotion Requirement

*For any* pawn reaching the opposite end of the board (8th rank for white, 1st rank for black), the system should require promotion to Queen, Rook, Bishop, or Knight before the game continues.

**Validates: Requirements 3.11**

### Property 13: Check Detection

*For any* board position where a King is under attack by an opponent piece, the system should mark the game state as "in check".

**Validates: Requirements 4.1**

### Property 14: Legal Moves in Check

*For any* board position where a King is in check, only moves that remove the check should be considered legal.

**Validates: Requirements 4.2**

### Property 15: Checkmate Detection

*For any* board position where a King is in check and no legal moves can remove the check, the system should declare checkmate and end the game.

**Validates: Requirements 4.3**

### Property 16: Stalemate Detection

*For any* board position where a player has no legal moves and the King is not in check, the system should declare stalemate and end the game as a draw.

**Validates: Requirements 4.4**

### Property 17: Threefold Repetition Draw

*For any* game where the same board position (same pieces, same positions, same player to move) occurs three times, either player should be able to claim a draw.

**Validates: Requirements 4.5**

### Property 18: Fifty-Move Rule Draw

*For any* game where 50 consecutive moves occur without a pawn move or piece capture, either player should be able to claim a draw.

**Validates: Requirements 4.6**

### Property 19: Insufficient Material Draw

*For any* board position with only Kings remaining, or only Kings and one Bishop/Knight, or only Kings and same-colored Bishops, the system should automatically declare a draw for insufficient material.

**Validates: Requirements 4.7, 4.8, 4.9**

### Property 20: Time Increment Addition

*For any* move completion in a game with time increment, the increment seconds should be added to the player's remaining time after they complete their move.

**Validates: Requirements 5.6**

### Property 21: Clock Synchronization Accuracy

*For any* clock synchronization between client and server, the time drift should not exceed 100 milliseconds.

**Validates: Requirements 5.7**

### Property 22: Timeout Victory

*For any* game where a player's time reaches zero, the system should immediately declare the opponent as winner by timeout.

**Validates: Requirements 5.9**

### Property 23: Move Transmission Latency

*For any* move transmitted between players, the transmission time from one client to the other should not exceed 100 milliseconds under normal network conditions.

**Validates: Requirements 6.1, 26.2**

### Property 24: Server-Side Move Validation

*For any* move received by the server, the move must be validated server-side before being broadcast to other clients or persisted to the database.

**Validates: Requirements 6.3, 24.1**

### Property 25: Game State Restoration on Reconnect

*For any* player reconnection after disconnection, the complete game state (board position, move history, clock times) should be restored within 2 seconds.

**Validates: Requirements 6.5, 32.3**

### Property 26: Server as Authoritative Source

*For any* game state query or update, the server-side state should be treated as the authoritative source, and client state should be synchronized to match it.

**Validates: Requirements 6.6**

### Property 27: Matchmaking Rating Range

*For any* matchmaking pairing, the ELO rating difference between paired players should not exceed 200 points (unless no suitable opponent is available within timeout).

**Validates: Requirements 7.2**

### Property 28: Initial Rating Assignment

*For any* newly registered player, the initial ELO rating for each time control should be exactly 1200.

**Validates: Requirements 8.1**

### Property 29: K-Factor Selection

*For any* player, the K-factor used in rating calculations should be: 40 if games < 30, 20 if games ≥ 30 and rating < 2400, or 10 if rating ≥ 2400.

**Validates: Requirements 8.2, 8.3, 8.4**

### Property 30: Rating Update Timeliness

*For any* completed rated game, both players' ratings should be updated and persisted within 5 seconds of game completion.

**Validates: Requirements 8.6**

### Property 31: ELO Formula Correctness

*For any* rating calculation, the expected score should be calculated using the formula: 1 / (1 + 10^((opponent_rating - player_rating) / 400)), and the rating change should be: K * (actual_score - expected_score).

**Validates: Requirements 8.11**

### Property 32: Unique Tournament Links

*For any* tournament created, the system should generate a unique shareable link that does not collide with any existing tournament link.

**Validates: Requirements 9.16**

### Property 33: Swiss Pairing by Score

*For any* Swiss System tournament round, players should be paired with opponents having the same score, or the closest score if exact matches are unavailable.

**Validates: Requirements 11.1**

### Property 34: No Repeat Pairings in Swiss

*For any* Swiss System tournament, no two players should be paired against each other more than once throughout the tournament.

**Validates: Requirements 11.2**

### Property 35: Bye Assignment for Odd Players

*For any* tournament round with an odd number of players, exactly one player should receive a bye (automatic win), and that player should not have received a bye in any previous round.

**Validates: Requirements 11.7, 11.8**

### Property 36: Move Recording in SAN

*For any* move made in a game, the move should be recorded in Standard Algebraic Notation (SAN) format in the database and move history.

**Validates: Requirements 14.1**

### Property 37: PGN Export Availability

*For any* completed game, the system should be able to export the game in valid PGN (Portable Game Notation) format.

**Validates: Requirements 14.10**

### Property 38: PGN Parsing Success

*For any* valid PGN file provided to the parser, the system should successfully parse it into a game object without errors.

**Validates: Requirements 28.1**

### Property 39: PGN Round-Trip Identity

*For any* valid game object, the following should hold: parse(format(parse(format(game)))) should produce a game object equivalent to parse(format(game)). This ensures that parsing and formatting are proper inverses.

**Validates: Requirements 28.10, 33.12**

### Property 40: Input Sanitization

*For any* user input received by the system (via API or WebSocket), the input should be sanitized to prevent SQL injection and XSS attacks before processing or storage.

**Validates: Requirements 24.5, 24.6**

### Property 41: Clock Pause on Disconnection

*For any* player disconnection during an active game, that player's clock should pause immediately and remain paused for up to 60 seconds or until reconnection.

**Validates: Requirements 32.2**

## Error Handling

### Error Categories

1. **Validation Errors**: Invalid input data (400 Bad Request)
2. **Authentication Errors**: Invalid credentials or expired tokens (401 Unauthorized)
3. **Authorization Errors**: Insufficient permissions (403 Forbidden)
4. **Not Found Errors**: Resource does not exist (404 Not Found)
5. **Conflict Errors**: Resource already exists or state conflict (409 Conflict)
6. **Rate Limit Errors**: Too many requests (429 Too Many Requests)
7. **Server Errors**: Internal failures (500 Internal Server Error)

### Error Handling Strategies

**Client-Side:**
- Display user-friendly error messages via toast notifications
- Log detailed errors to console for debugging
- Retry failed requests with exponential backoff
- Gracefully degrade functionality when services unavailable

**Server-Side:**
- Log all errors with full context (user, request, stack trace)
- Send alerts for critical errors
- Return consistent error response format
- Implement circuit breakers for external services

**WebSocket:**
- Automatic reconnection with exponential backoff
- Queue messages during disconnection
- Restore state on reconnection
- Notify user of connection status

### Graceful Degradation

- **Offline Mode**: Allow viewing past games and profile when offline (PWA)
- **Slow Network**: Show loading states, reduce polling frequency
- **Service Outage**: Display maintenance message, queue operations
- **Partial Failure**: Continue functioning with reduced features


## Testing Strategy

The ChessArena platform employs a comprehensive dual testing approach combining traditional unit/integration tests with property-based testing to ensure correctness, reliability, and performance.

### Testing Framework Selection

**Backend (NestJS):**
- **Jest**: Unit and integration testing framework
- **fast-check**: Property-based testing library
- **Supertest**: HTTP endpoint testing
- **@nestjs/testing**: NestJS testing utilities

**Frontend (Next.js):**
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **fast-check**: Property-based testing
- **Playwright**: End-to-end testing

### Unit Testing Approach

Unit tests focus on specific examples, edge cases, and error conditions for individual functions and components.

**Coverage Goals:**
- Minimum 80% code coverage for critical business logic
- 100% coverage for chess engine move validation
- 100% coverage for rating calculations
- High coverage for authentication and authorization

**Key Areas:**
- Chess move validation (all piece types, special moves)
- Draw condition detection (stalemate, insufficient material, etc.)
- Rating calculations (ELO formula, K-factor selection)
- Tournament pairing algorithms (Swiss, Round Robin, Elimination)
- PGN parsing and formatting
- Input validation and sanitization

### Property-Based Testing Approach

Property-based tests verify universal properties across randomized inputs. Each property test runs a minimum of 100 iterations with randomly generated test data.

**Property Test Configuration:**
```typescript
import fc from 'fast-check';

describe('Property Tests', () => {
  it('Property 39: PGN Round-Trip Identity', () => {
    // Feature: chess-arena, Property 39: PGN round-trip identity
    fc.assert(
      fc.property(
        gameObjectArbitrary(),
        (game) => {
          const pgn1 = formatPGN(game);
          const parsed1 = parsePGN(pgn1);
          const pgn2 = formatPGN(parsed1);
          const parsed2 = parsePGN(pgn2);
          
          return deepEqual(parsed1, parsed2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property Test Tagging:**
Each property test must include a comment tag referencing the design document:
```typescript
// Feature: chess-arena, Property {number}: {property_text}
```

**Generators (Arbitraries):**
Custom generators create valid random test data:
- `gameObjectArbitrary()`: Random valid game states
- `fenArbitrary()`: Random valid FEN positions
- `moveArbitrary()`: Random valid chess moves
- `userArbitrary()`: Random user data
- `tournamentArbitrary()`: Random tournament configurations

### Property-Based Test Examples

**Property 9: Dual-Side Move Validation**
```typescript
it('Property 9: Client and server validation agree', () => {
  // Feature: chess-arena, Property 9: Dual-side move validation
  fc.assert(
    fc.property(
      fenArbitrary(),
      moveArbitrary(),
      (fen, move) => {
        const clientValid = clientChessEngine.validateMove(fen, move);
        const serverValid = serverChessEngine.validateMove(fen, move);
        return clientValid === serverValid;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 20: Time Increment Addition**
```typescript
it('Property 20: Increment added after move', () => {
  // Feature: chess-arena, Property 20: Time increment addition
  fc.assert(
    fc.property(
      fc.integer({ min: 1000, max: 300000 }), // timeRemaining
      fc.integer({ min: 0, max: 30 }),        // increment
      (timeRemaining, increment) => {
        const timeBefore = timeRemaining;
        const timeAfter = applyIncrement(timeBefore, increment);
        return timeAfter === timeBefore + (increment * 1000);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 31: ELO Formula Correctness**
```typescript
it('Property 31: ELO calculation uses correct formula', () => {
  // Feature: chess-arena, Property 31: ELO formula correctness
  fc.assert(
    fc.property(
      fc.integer({ min: 100, max: 3000 }),  // playerRating
      fc.integer({ min: 100, max: 3000 }),  // opponentRating
      fc.constantFrom(10, 20, 40),          // kFactor
      fc.constantFrom(0, 0.5, 1),           // result
      (playerRating, opponentRating, kFactor, result) => {
        const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
        const ratingChange = calculateRatingChange(playerRating, opponentRating, kFactor, result);
        const expectedChange = Math.round(kFactor * (result - expectedScore));
        return ratingChange === expectedChange;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 34: No Repeat Pairings in Swiss**
```typescript
it('Property 34: Swiss tournament has no repeat pairings', () => {
  // Feature: chess-arena, Property 34: No repeat pairings in Swiss
  fc.assert(
    fc.property(
      fc.array(userArbitrary(), { minLength: 8, maxLength: 32 }),
      fc.integer({ min: 3, max: 7 }),  // number of rounds
      (players, rounds) => {
        const tournament = createSwissTournament(players, rounds);
        const allPairings = getAllPairings(tournament);
        
        // Check no pair appears twice
        const pairingSet = new Set();
        for (const pairing of allPairings) {
          const key = [pairing.white, pairing.black].sort().join('-');
          if (pairingSet.has(key)) {
            return false;  // Repeat pairing found
          }
          pairingSet.add(key);
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 39: PGN Round-Trip Identity**
```typescript
it('Property 39: PGN parse-format-parse is identity', () => {
  // Feature: chess-arena, Property 39: PGN round-trip identity
  fc.assert(
    fc.property(
      gameObjectArbitrary(),
      (game) => {
        const pgn1 = formatPGN(game);
        const parsed1 = parsePGN(pgn1);
        const pgn2 = formatPGN(parsed1);
        const parsed2 = parsePGN(pgn2);
        
        // parsed1 and parsed2 should be equivalent
        return (
          parsed1.moves.length === parsed2.moves.length &&
          parsed1.result === parsed2.result &&
          parsed1.headers.White === parsed2.headers.White &&
          parsed1.headers.Black === parsed2.headers.Black
        );
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests verify that multiple components work together correctly.

**API Integration Tests:**
- Test all REST endpoints with valid and invalid inputs
- Verify authentication and authorization
- Test database transactions and rollbacks
- Verify error responses and status codes

**WebSocket Integration Tests:**
- Test real-time move transmission
- Verify room joining and leaving
- Test disconnection and reconnection
- Verify message broadcasting

**Service Integration Tests:**
- Test chess engine with game service
- Test rating calculator with game completion
- Test tournament manager with pairing service
- Test notification service with event triggers

### End-to-End Testing

E2E tests verify complete user workflows from UI to database.

**Critical User Flows:**
- User registration and email verification
- Login and authentication
- Create and join game
- Play complete game with moves
- Join tournament and play tournament game
- View profile and statistics
- Admin user management

**E2E Test Example:**
```typescript
test('Complete game flow', async ({ page }) => {
  // Login as player 1
  await page.goto('/login');
  await page.fill('[name="email"]', 'player1@college.edu');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Create game
  await page.goto('/play');
  await page.click('text=Quick Play');
  await page.click('text=Blitz 5+3');
  
  // Wait for match
  await page.waitForSelector('text=Match found');
  
  // Make moves
  await page.click('[data-square="e2"]');
  await page.click('[data-square="e4"]');
  
  // Verify move made
  await expect(page.locator('[data-square="e4"]')).toContainText('♙');
});
```

### Load Testing

Load tests verify system performance under concurrent usage.

**Load Test Scenarios:**
- 100 concurrent games
- 1000 simultaneous WebSocket connections
- 500 API requests per second
- Tournament with 1000 players

**Load Test Tools:**
- **Artillery**: HTTP and WebSocket load testing
- **k6**: Performance testing

**Performance Targets:**
- API response time: < 200ms (p95)
- Move transmission latency: < 100ms
- WebSocket connection time: < 500ms
- Database query time: < 50ms (p95)

### Test Automation

**Continuous Integration:**
- Run all tests on every commit
- Block merge if tests fail
- Generate coverage reports
- Run property tests with 100 iterations

**Test Execution:**
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run property tests
npm run test:property

# Run with coverage
npm run test:coverage

# Run load tests
npm run test:load
```

### Test Data Management

**Test Database:**
- Separate test database instance
- Reset database before each test suite
- Seed with fixture data
- Use transactions for test isolation

**Test Fixtures:**
- Predefined user accounts
- Sample games with known outcomes
- Tournament configurations
- Rating scenarios

### Monitoring and Observability

**Application Monitoring:**
- Error tracking (Sentry)
- Performance monitoring (New Relic / DataDog)
- Log aggregation (ELK Stack)
- Uptime monitoring (Pingdom)

**Metrics to Track:**
- API response times
- WebSocket connection count
- Active game count
- Database query performance
- Error rates
- User activity

**Alerting:**
- Error rate exceeds threshold
- Response time degradation
- Service downtime
- Database connection issues
- High memory/CPU usage

## Deployment and Infrastructure

### Containerization

**Docker Configuration:**
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: chessarena
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
  
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/chessarena
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### CI/CD Pipeline

**GitHub Actions Workflow:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:property
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t chessarena:${{ github.sha }} .
      
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Deploy commands here
```

### Environment Configuration

**Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chessarena
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=30d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@chessarena.com

# Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://chessarena.com
```

### Scaling Strategy

**Horizontal Scaling:**
- Stateless backend services (can run multiple instances)
- Load balancer distributes traffic
- Redis for shared session storage
- WebSocket sticky sessions

**Database Scaling:**
- Read replicas for query distribution
- Connection pooling
- Query optimization and indexing
- Caching frequently accessed data

**CDN and Caching:**
- Static assets served via CDN
- API response caching with Redis
- Browser caching with appropriate headers
- Service worker caching for PWA

### Security Measures

**Application Security:**
- HTTPS/TLS for all connections
- Secure WebSocket (WSS)
- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS prevention
- CSRF protection
- Rate limiting
- CORS configuration

**Infrastructure Security:**
- Firewall rules
- DDoS protection
- Regular security audits
- Dependency vulnerability scanning
- Secrets management
- Database encryption at rest
- Backup encryption

### Backup and Recovery

**Backup Strategy:**
- Automated daily database backups
- Backup retention: 30 days
- Geographically distributed backup storage
- Point-in-time recovery capability

**Disaster Recovery:**
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 24 hours
- Monthly backup restoration tests
- Documented recovery procedures

### Monitoring and Logging

**Application Logs:**
- Structured JSON logging
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation
- Log retention: 90 days

**Metrics:**
- Request rate and latency
- Error rates
- Active connections
- Database performance
- Memory and CPU usage
- Custom business metrics (games played, users online)

**Alerts:**
- High error rate
- Slow response times
- Service downtime
- Database issues
- High resource usage

## Conclusion

This design document provides a comprehensive technical specification for the ChessArena platform, covering system architecture, database schema, API design, WebSocket events, frontend component structure, state management, third-party integrations, correctness properties, error handling, testing strategy, and deployment infrastructure.

The design emphasizes:
- **Real-time performance** with sub-100ms move transmission
- **Server authority** for game state and validation
- **Type safety** with end-to-end TypeScript
- **Scalability** through stateless services and horizontal scaling
- **Correctness** through property-based testing and comprehensive validation
- **Security** with defense-in-depth measures
- **Reliability** through error handling and graceful degradation

Implementation should follow this design closely, with all 41 correctness properties validated through property-based tests running a minimum of 100 iterations each.
