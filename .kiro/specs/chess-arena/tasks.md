# Implementation Plan: ChessArena Platform

## Overview

This implementation plan breaks down the ChessArena platform into small, actionable tasks following a phased development approach. Each task is designed to be completed in 1-2 hours and builds incrementally toward a fully functional chess tournament platform. The implementation uses TypeScript with Next.js (frontend) and NestJS (backend), following the technical design specified in the design document.

## Development Phases

1. **PHASE 1 - FOUNDATION**: Project setup, database, authentication, basic UI
2. **PHASE 2 - CHESS CORE**: Chess engine, board UI, move validation, game rules
3. **PHASE 3 - MULTIPLAYER**: WebSocket server, real-time games, matchmaking
4. **PHASE 4 - TOURNAMENTS**: Tournament system, pairing algorithms, standings
5. **PHASE 5 - SOCIAL & PROFILE**: Profiles, history, leaderboards, achievements
6. **PHASE 6 - ANALYSIS**: Post-game analysis with Stockfish
7. **PHASE 7 - ADMIN**: Admin panel and moderation tools
8. **PHASE 8 - MOBILE**: Responsive design, PWA, mobile optimization
9. **PHASE 9 - POLISH**: Testing, deployment, performance optimization

## Tasks

### PHASE 1: FOUNDATION (Week 1-2)

- [ ] 1. Initialize project structure and development environment
  - [x] 1.1 Create monorepo structure with frontend and backend directories
    - Initialize Next.js 14 app in `frontend/` with TypeScript and App Router
    - Initialize NestJS app in `backend/` with TypeScript
    - Set up shared types package in `shared/`
    - Configure ESLint and Prettier for both projects
    - _Requirements: 34.1_
  
  - [x] 1.2 Set up Docker development environment
    - Create Dockerfile for backend service
    - Create Dockerfile for frontend service
    - Create docker-compose.yml with PostgreSQL, Redis, backend, and frontend services
    - Configure hot-reload for development
    - _Requirements: 34.1_
  
  - [x] 1.3 Configure environment variables and secrets management
    - Create .env.example files for frontend and backend
    - Set up environment variable validation using Zod
    - Configure different environments (development, staging, production)
    - _Requirements: 34.1_

- [ ] 2. Set up database and ORM
  - [x] 2.1 Initialize Prisma ORM and create database schema
    - Install Prisma and initialize in backend
    - Define all database models in schema.prisma (users, games, tournaments, ratings, etc.)
    - Configure PostgreSQL connection
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_
  
  - [x] 2.2 Create and run initial database migrations
    - Generate Prisma migration files
    - Run migrations to create all tables
    - Verify all indexes and constraints are created
    - _Requirements: 27.1_
  
  - [x] 2.3 Set up Redis for caching and sessions
    - Configure Redis connection in backend
    - Create Redis service wrapper with connection pooling
    - Implement basic cache operations (get, set, delete)
    - _Requirements: 26.15_
  
  - [x] 2.4 Create database seed script with test data
    - Create seed script with sample users, games, and tournaments
    - Add approved college domains list
    - Create admin user account
    - _Requirements: 25.16_


- [ ] 3. Implement authentication system
  - [x] 3.1 Create user registration with email and password
    - Create User entity and repository
    - Implement registration endpoint with email/password validation
    - Hash passwords using bcrypt with 10 salt rounds
    - Validate college email domains
    - _Requirements: 1.1, 1.4, 1.5_
  
  - [ ]* 3.2 Write property test for password hashing
    - **Property 3: Password hashing with bcrypt**
    - **Validates: Requirements 1.5**
  
  - [x] 3.3 Implement email verification system
    - Generate email verification tokens
    - Create email verification endpoint
    - Send verification emails using SendGrid
    - _Requirements: 1.3_
  
  - [ ]* 3.4 Write property test for email verification
    - **Property 1: Email verification sent on registration**
    - **Validates: Requirements 1.3**
  
  - [x] 3.5 Implement JWT authentication with login endpoint
    - Create login endpoint with credential validation
    - Generate JWT tokens with 24-hour expiration
    - Implement "Remember Me" with 30-day tokens
    - Create JWT strategy and guards
    - _Requirements: 1.2, 1.7, 1.8_
  
  - [ ]* 3.6 Write property tests for JWT token expiration
    - **Property 5: JWT token expiration (24 hours)**
    - **Property 6: Extended session with Remember Me (30 days)**
    - **Validates: Requirements 1.7, 1.8**
  
  - [x] 3.7 Implement Google OAuth authentication
    - Configure Google OAuth strategy
    - Create OAuth callback endpoint
    - Link OAuth accounts to existing users
    - _Requirements: 1.2_
  
  - [x] 3.8 Implement password reset functionality
    - Create forgot-password endpoint
    - Generate password reset tokens with 1-hour expiration
    - Create reset-password endpoint
    - Send password reset emails
    - _Requirements: 1.6_
  
  - [ ]* 3.9 Write property test for password reset expiration
    - **Property 4: Password reset link expiration**
    - **Validates: Requirements 1.6**
  
  - [x] 3.10 Implement role-based access control (RBAC)
    - Create roles decorator and guard
    - Implement role checking for super_admin, tournament_admin, player, spectator
    - Protect admin endpoints with role guards
    - _Requirements: 1.11_


- [ ] 4. Create basic frontend UI and layout
  - [x] 4.1 Set up Tailwind CSS and design system
    - Configure Tailwind CSS with custom theme
    - Create color palette for dark and light themes
    - Set up CSS variables for theming
    - _Requirements: 22.1, 22.2_
  
  - [x] 4.2 Create reusable UI components
    - Build Button, Input, Select, Modal, Card, Badge, Avatar components
    - Implement Tabs, Dropdown, Toast, Spinner, Skeleton components
    - Add proper TypeScript types for all components
    - _Requirements: 22.5, 22.6, 22.9_
  
  - [x] 4.3 Create authentication pages (login and register)
    - Build login page with email/password and Google OAuth
    - Build registration page with form validation
    - Implement client-side form validation
    - Add loading states and error handling
    - _Requirements: 1.1, 1.2_
  
  - [x] 4.4 Create main layout with navigation
    - Build Navbar component with user menu
    - Build Sidebar component for desktop
    - Build MobileNav component for mobile bottom navigation
    - Implement responsive layout switching
    - _Requirements: 21.9_
  
  - [x] 4.5 Create dashboard page
    - Build dashboard layout with sections
    - Create QuickPlaySection component
    - Create ActiveTournamentsSection component
    - Create RecentGamesSection component
    - Add NotificationsList component
    - _Requirements: 16.12_
  
  - [x] 4.6 Implement theme switching functionality
    - Create theme toggle component
    - Implement theme persistence in localStorage
    - Add smooth theme transitions
    - _Requirements: 22.2, 22.3, 22.4_

- [x] 5. Checkpoint - Foundation complete
  - Ensure all tests pass, ask the user if questions arise.


### PHASE 2: CHESS GAME CORE (Week 3-4)

- [ ] 6. Implement chess engine with move validation
  - [x] 6.1 Set up chess.js library and create chess engine service
    - Install chess.js library
    - Create ChessEngineService in backend
    - Implement move validation wrapper methods
    - Create FEN and PGN utility functions
    - _Requirements: 2.11_
  
  - [x] 6.2 Implement basic piece movement validation
    - Validate King moves (one square any direction)
    - Validate Queen moves (any squares horizontal/vertical/diagonal)
    - Validate Rook moves (any squares horizontal/vertical)
    - Validate Bishop moves (any squares diagonal)
    - Validate Knight moves (L-shape)
    - Validate Pawn moves (forward one/two, diagonal capture)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [ ]* 6.3 Write unit tests for basic piece movements
    - Test all piece types with valid and invalid moves
    - Test edge cases (board boundaries, blocking pieces)
    - _Requirements: 2.1-2.8, 33.1_
  
  - [ ]* 6.4 Write property test for King movement
    - **Property 7: King movement validation**
    - **Validates: Requirements 2.1**
  
  - [x] 6.5 Implement piece blocking validation
    - Prevent pieces from moving through other pieces (except Knights)
    - Validate clear path for sliding pieces
    - _Requirements: 2.9_
  
  - [ ]* 6.6 Write property test for piece blocking
    - **Property 8: Piece movement through blocking**
    - **Validates: Requirements 2.9**
  
  - [x] 6.7 Implement player turn validation
    - Prevent players from moving opponent pieces
    - Validate correct player turn
    - _Requirements: 2.10_


- [ ] 7. Implement special chess moves
  - [x] 7.1 Implement castling logic
    - Validate kingside and queenside castling
    - Check King and Rook haven't moved
    - Verify no pieces between King and Rook
    - Prevent castling through/into/from check
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  
  - [ ]* 7.2 Write unit tests for castling
    - Test valid castling scenarios
    - Test all castling prevention conditions
    - _Requirements: 3.1-3.8, 33.2_
  
  - [ ]* 7.3 Write property test for castling legality
    - **Property 10: Castling legality**
    - **Validates: Requirements 3.1-3.8**
  
  - [x] 7.4 Implement en passant capture
    - Detect when en passant is available
    - Validate en passant timing (immediately after opponent pawn move)
    - Remove captured pawn correctly
    - _Requirements: 3.9, 3.10_
  
  - [ ]* 7.5 Write unit tests for en passant
    - Test en passant capture scenarios
    - Test timing restrictions
    - _Requirements: 3.9, 3.10, 33.2_
  
  - [ ]* 7.6 Write property test for en passant timing
    - **Property 11: En passant timing**
    - **Validates: Requirements 3.9**
  
  - [x] 7.7 Implement pawn promotion
    - Detect when pawn reaches opposite end
    - Display promotion selection UI
    - Handle promotion piece selection
    - Auto-promote to Queen after 30 seconds timeout
    - _Requirements: 3.11, 3.12, 3.13_
  
  - [ ]* 7.8 Write unit tests for pawn promotion
    - Test promotion detection
    - Test all promotion piece types
    - _Requirements: 3.11-3.13, 33.2_
  
  - [ ]* 7.9 Write property test for pawn promotion requirement
    - **Property 12: Pawn promotion requirement**
    - **Validates: Requirements 3.11**


- [ ] 8. Implement check, checkmate, and draw detection
  - [x] 8.1 Implement check detection and validation
    - Detect when King is under attack
    - Display check indicator on UI
    - Restrict moves to only those that remove check
    - _Requirements: 4.1, 4.2_
  
  - [ ]* 8.2 Write unit tests for check detection
    - Test various check scenarios
    - Test legal moves in check
    - _Requirements: 4.1, 4.2, 33.3_
  
  - [ ]* 8.3 Write property tests for check detection and legal moves
    - **Property 13: Check detection**
    - **Property 14: Legal moves in check**
    - **Validates: Requirements 4.1, 4.2**
  
  - [x] 8.4 Implement checkmate detection
    - Detect when King is in check with no legal moves
    - End game and declare winner
    - Record termination reason as checkmate
    - _Requirements: 4.3_
  
  - [ ]* 8.5 Write unit tests for checkmate detection
    - Test various checkmate patterns (back rank, smothered, etc.)
    - Test positions that look like checkmate but aren't
    - _Requirements: 4.3, 33.3_
  
  - [ ]* 8.6 Write property test for checkmate detection
    - **Property 15: Checkmate detection**
    - **Validates: Requirements 4.3**
  
  - [x] 8.7 Implement stalemate detection
    - Detect when player has no legal moves and King not in check
    - End game as draw
    - _Requirements: 4.4_
  
  - [ ]* 8.8 Write unit tests for stalemate detection
    - Test stalemate positions
    - _Requirements: 4.4, 33.3_
  
  - [ ]* 8.9 Write property test for stalemate detection
    - **Property 16: Stalemate detection**
    - **Validates: Requirements 4.4**
  
  - [x] 8.10 Implement threefold repetition detection
    - Track position history
    - Detect when same position occurs three times
    - Allow players to claim draw
    - _Requirements: 4.5_
  
  - [ ]* 8.11 Write unit tests for threefold repetition
    - Test repetition detection
    - _Requirements: 4.5, 33.3_
  
  - [ ]* 8.12 Write property test for threefold repetition
    - **Property 17: Threefold repetition draw**
    - **Validates: Requirements 4.5**
  
  - [x] 8.13 Implement fifty-move rule detection
    - Track moves without pawn move or capture
    - Allow draw claim after 50 moves
    - _Requirements: 4.6_
  
  - [ ]* 8.14 Write unit tests for fifty-move rule
    - Test fifty-move detection
    - _Requirements: 4.6, 33.3_
  
  - [ ]* 8.15 Write property test for fifty-move rule
    - **Property 18: Fifty-move rule draw**
    - **Validates: Requirements 4.6**
  
  - [x] 8.16 Implement insufficient material detection
    - Detect King vs King
    - Detect King+Bishop/Knight vs King
    - Detect King+Bishops (same color) vs King+Bishops (same color)
    - Auto-declare draw
    - _Requirements: 4.7, 4.8, 4.9_
  
  - [ ]* 8.17 Write unit tests for insufficient material
    - Test all insufficient material scenarios
    - _Requirements: 4.7-4.9, 33.3_
  
  - [ ]* 8.18 Write property test for insufficient material
    - **Property 19: Insufficient material draw**
    - **Validates: Requirements 4.7, 4.8, 4.9**
  
  - [x] 8.19 Implement draw offer and acceptance
    - Create draw offer mechanism
    - Notify opponent of draw offer
    - Handle draw acceptance/decline
    - Implement 60-second timeout for draw offers
    - _Requirements: 4.10, 4.11_


- [ ] 9. Create chess board UI and game interface
  - [x] 9.1 Install and configure react-chessboard library
    - Install react-chessboard package
    - Create ChessBoard wrapper component
    - Configure board styling and themes
    - _Requirements: 22.16_
  
  - [x] 9.2 Implement piece drag-and-drop functionality
    - Handle piece selection and drop
    - Show legal move highlights
    - Implement move confirmation
    - _Requirements: 21.2_
  
  - [x] 9.3 Create move list display component
    - Display moves in Standard Algebraic Notation (SAN)
    - Support figurine notation option
    - Allow navigation through move history
    - Show timestamps for each move
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [x] 9.4 Create captured pieces display
    - Show captured pieces for both players
    - Display material advantage
    - _Requirements: 14.6_
  
  - [x] 9.5 Create piece promotion dialog
    - Display promotion piece selection UI
    - Handle promotion piece selection
    - Implement 30-second auto-promotion timeout
    - _Requirements: 3.12, 3.13_
  
  - [x] 9.6 Create game controls component
    - Add Resign button
    - Add Offer Draw button
    - Add Settings button
    - Handle button states and permissions
    - _Requirements: 4.10, 4.11_
  
  - [x] 9.7 Implement board themes and piece sets
    - Create multiple board color themes
    - Create multiple piece set options
    - Allow user to select preferences
    - Persist theme preferences
    - _Requirements: 22.16, 22.17_


- [ ] 10. Implement chess clock and time controls
  - [~] 10.1 Create chess clock component
    - Build ChessClock component with countdown display
    - Show time with decisecond precision
    - Display visual warning at 10 seconds
    - Play ticking sound at 10 seconds
    - _Requirements: 5.8, 5.13, 23.8_
  
  - [x] 10.2 Implement time control configurations
    - Support Bullet time controls (1+0, 1+1, 2+1)
    - Support Blitz time controls (3+0, 3+2, 5+0, 5+3, 5+5)
    - Support Rapid time controls (10+0, 10+5, 15+10, 15+15, 20+0)
    - Support Classical time controls (30+0, 30+20, 45+45, 60+30, 90+30)
    - Allow custom time controls for tournaments
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 10.3 Implement time increment logic
    - Add increment to player's time after move completion
    - Track time taken per move
    - _Requirements: 5.6_
  
  - [ ]* 10.4 Write property test for time increment
    - **Property 20: Time increment addition**
    - **Validates: Requirements 5.6**
  
  - [x] 10.5 Implement clock synchronization
    - Sync clocks between client and server every 1 second
    - Maintain server-side authoritative time
    - Handle clock drift correction
    - _Requirements: 5.7, 5.12_
  
  - [ ]* 10.6 Write property test for clock synchronization
    - **Property 21: Clock synchronization accuracy**
    - **Validates: Requirements 5.7**
  
  - [x] 10.7 Implement timeout detection and handling
    - Detect when player time reaches zero
    - Declare opponent winner by timeout
    - Pause clock on disconnection for 60 seconds
    - Resume clock if no reconnection
    - _Requirements: 5.9, 5.10, 5.11_
  
  - [ ]* 10.8 Write property test for timeout victory
    - **Property 22: Timeout victory**
    - **Validates: Requirements 5.9**

- [ ] 11. Implement game notation and PGN support
  - [x] 11.1 Create PGN parser
    - Parse PGN headers (Event, Site, Date, Round, White, Black, Result)
    - Parse move text in SAN
    - Parse comments and variations
    - Handle multiple games in one file
    - Return descriptive errors for invalid PGN
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6_
  
  - [x] 11.2 Create PGN formatter
    - Format game objects into valid PGN
    - Include all required headers
    - Format moves with proper notation
    - _Requirements: 28.7, 28.8, 28.9_
  
  - [ ]* 11.3 Write unit tests for PGN parser and formatter
    - Test parsing valid PGN files
    - Test error handling for invalid PGN
    - Test formatting game objects
    - _Requirements: 28.1-28.9, 33.12_
  
  - [ ]* 11.4 Write property test for PGN round-trip
    - **Property 39: PGN round-trip identity**
    - **Validates: Requirements 28.10**
  
  - [x] 11.5 Implement PGN import/export endpoints
    - Create endpoint to upload PGN files
    - Create endpoint to download game as PGN
    - Create endpoint to download multiple games as PGN
    - _Requirements: 28.11, 28.12, 28.13_

- [x] 12. Checkpoint - Chess core complete
  - Ensure all tests pass, ask the user if questions arise.


### PHASE 3: ONLINE MULTIPLAYER (Week 5-6)

- [ ] 13. Set up WebSocket server infrastructure
  - [x] 13.1 Configure Socket.IO in NestJS backend
    - Install Socket.IO packages
    - Create WebSocket gateway module
    - Configure CORS and authentication for WebSocket
    - Set up namespace structure (/game, /matchmaking, /tournament, /notifications)
    - _Requirements: 6.2_
  
  - [x] 13.2 Implement WebSocket authentication middleware
    - Validate JWT tokens on WebSocket connection
    - Attach user data to socket connection
    - Handle authentication errors
    - _Requirements: 24.3_
  
  - [x] 13.3 Create game room management
    - Implement room join/leave logic
    - Track active connections per game
    - Handle room cleanup on game end
    - _Requirements: 6.1_
  
  - [x] 13.4 Implement connection/disconnection handling
    - Handle client connect events
    - Handle client disconnect events
    - Notify opponents of disconnection within 3 seconds
    - Implement automatic reconnection logic
    - _Requirements: 6.4, 32.5_

- [ ] 14. Implement real-time game server
  - [x] 14.1 Create Game Gateway for WebSocket events
    - Implement join_game event handler
    - Implement leave_game event handler
    - Implement make_move event handler
    - Implement resign event handler
    - Implement offer_draw, accept_draw, decline_draw handlers
    - _Requirements: 6.1, 6.3_
  
  - [x] 14.2 Implement server-side move validation and broadcasting
    - Validate moves server-side before broadcasting
    - Reject invalid moves with error messages
    - Broadcast valid moves to all clients in game room
    - Update game state in database
    - _Requirements: 6.3, 6.9, 24.1_
  
  - [ ]* 14.3 Write property test for server-side move validation
    - **Property 24: Server-side move validation**
    - **Validates: Requirements 6.3, 24.1**
  
  - [ ]* 14.4 Write property test for dual-side validation agreement
    - **Property 9: Dual-side move validation**
    - **Validates: Requirements 2.11**
  
  - [x] 14.5 Implement move transmission with latency optimization
    - Optimize WebSocket message size
    - Implement binary protocol for moves if needed
    - Ensure sub-100ms transmission time
    - _Requirements: 6.1, 26.2_
  
  - [ ]* 14.6 Write property test for move transmission latency
    - **Property 23: Move transmission latency**
    - **Validates: Requirements 6.1, 26.2**
  
  - [~] 14.7 Implement game state synchronization
    - Maintain authoritative game state on server
    - Sync complete game state to clients
    - Handle state conflicts
    - _Requirements: 6.6_
  
  - [ ]* 14.8 Write property test for server authority
    - **Property 26: Server as authoritative source**
    - **Validates: Requirements 6.6**
  
  - [x] 14.9 Implement reconnection and state restoration
    - Detect client reconnection
    - Restore complete game state within 2 seconds
    - Resume game from correct position
    - _Requirements: 6.5, 32.3_
  
  - [ ]* 14.10 Write property test for game state restoration
    - **Property 25: Game state restoration on reconnect**
    - **Validates: Requirements 6.5, 32.3**


- [ ] 15. Implement real-time clock synchronization
  - [x] 15.1 Create server-side clock management
    - Track clock times server-side for each game
    - Update clocks on move completion
    - Prevent client-side clock manipulation
    - _Requirements: 5.12_
  
  - [x] 15.2 Implement clock sync broadcasting
    - Broadcast clock updates every 1 second
    - Include server timestamp for drift correction
    - Handle clock pause on disconnection
    - _Requirements: 5.7, 5.10_
  
  - [x] 15.3 Create client-side clock synchronization
    - Receive clock sync messages
    - Adjust for network latency
    - Display synchronized time
    - _Requirements: 5.7_

- [x] 16. Create game CRUD and management endpoints
  - [x] 16.1 Create game creation endpoint
    - Implement POST /api/games endpoint
    - Validate time control and settings
    - Create game record in database
    - Return game ID and details
    - _Requirements: 7.3_
  
  - [x] 16.2 Create game retrieval endpoints
    - Implement GET /api/games/:id endpoint
    - Include moves, players, and game state
    - Implement GET /api/games/active for user's active games
    - _Requirements: 14.7_
  
  - [x] 16.3 Implement game result recording
    - Save complete game record on completion
    - Record all moves with timestamps
    - Save termination reason
    - Generate and save PGN
    - _Requirements: 6.12, 4.12_
  
  - [x] 16.4 Create game history endpoints
    - Implement GET /api/users/:userId/games with pagination
    - Support filtering by opponent, result, time control, date range
    - _Requirements: 14.8_


- [-] 17. Implement matchmaking system
  - [x] 17.1 Create matchmaking queue service
    - Implement Redis-based queue for each time control
    - Add players to queue with rating and preferences
    - Track queue position and wait time
    - _Requirements: 7.1, 7.9_
  
  - [x] 17.2 Implement matchmaking algorithm
    - Pair players with similar ELO (within 200 points)
    - Match by time control preference
    - Prioritize by wait time
    - Create game when match found
    - _Requirements: 7.2_
  
  - [ ]* 17.3 Write property test for matchmaking rating range
    - **Property 27: Matchmaking rating range**
    - **Validates: Requirements 7.2**
  
  - [x] 17.4 Create Matchmaking Gateway for WebSocket
    - Implement join_queue event handler
    - Implement leave_queue event handler
    - Broadcast queue position updates
    - Notify players when match found
    - _Requirements: 7.1, 7.11_
  
  - [x] 17.5 Implement matchmaking endpoints
    - Create POST /api/matchmaking/queue endpoint
    - Create DELETE /api/matchmaking/queue endpoint
    - Create GET /api/matchmaking/status endpoint
    - _Requirements: 7.1, 7.11_
  
  - [x] 17.6 Implement direct challenge system
    - Create challenge creation endpoint
    - Send challenge notifications
    - Handle challenge acceptance/decline
    - Implement 60-second challenge expiration
    - _Requirements: 7.4, 7.5, 7.6, 7.7_
  
  - [x] 17.7 Implement rematch functionality
    - Offer rematch after game completion
    - Handle rematch acceptance
    - Create new game with same settings
    - _Requirements: 7.8_
  
  - [x] 17.8 Prevent multiple active games
    - Check if player already in active game
    - Prevent joining matchmaking while in game
    - _Requirements: 7.10_

- [ ] 18. Implement in-game chat
  - [x] 18.1 Create chat message storage and retrieval
    - Create chat_messages table operations
    - Store messages with game_id and sender
    - Limit message length to 200 characters
    - _Requirements: 19.9_
  
  - [x] 18.2 Create Chat Gateway for WebSocket
    - Implement send_message event handler
    - Implement typing indicator events
    - Broadcast messages to game room
    - _Requirements: 19.1, 19.2, 19.8_
  
  - [x] 18.3 Implement chat UI component
    - Create GameChat component
    - Display message history
    - Show typing indicators
    - Add quick message buttons
    - _Requirements: 19.1, 19.3_
  
  - [x] 18.4 Implement chat moderation
    - Filter profanity and inappropriate language
    - Rate limit to 5 messages per minute
    - Allow disabling chat per game or globally
    - Implement report functionality
    - _Requirements: 19.4, 19.5, 19.6, 19.7, 19.10_

- [x] 19. Implement sound effects
  - [x] 19.1 Add sound effect files and audio service
    - Add sound files for move, capture, check, checkmate, castling
    - Add sound files for game start/end, notifications
    - Create AudioService to manage sound playback
    - _Requirements: 23.1-23.11_
  
  - [x] 19.2 Implement sound controls
    - Create volume slider (0-100%)
    - Create mute toggle
    - Create individual sound effect toggles
    - Persist sound preferences
    - _Requirements: 23.12, 23.13, 23.14, 23.15_
  
  - [x] 19.3 Integrate sounds with game events
    - Play sounds on move, capture, check, checkmate, castling
    - Play ticking sound at 10 seconds
    - Play sounds on notifications and chat messages
    - _Requirements: 23.1-23.11_

- [x] 20. Checkpoint - Multiplayer complete
  - Ensure all tests pass, ask the user if questions arise.


### PHASE 4: TOURNAMENT SYSTEM (Week 7-9)

- [x] 21. Implement ELO rating system
  - [x] 21.1 Create rating calculation service
    - Implement ELO expected score formula
    - Implement rating change calculation
    - Implement K-factor selection logic
    - _Requirements: 8.11, 8.2, 8.3, 8.4_
  
  - [x]* 21.2 Write unit tests for ELO calculations
    - Test expected score calculation
    - Test rating change for various scenarios
    - Test K-factor selection
    - _Requirements: 8.11, 33.4_
  
  - [x]* 21.3 Write property test for initial rating
    - **Property 28: Initial rating assignment**
    - **Validates: Requirements 8.1**
  
  - [x]* 21.4 Write property test for K-factor selection
    - **Property 29: K-factor selection**
    - **Validates: Requirements 8.2, 8.3, 8.4**
  
  - [x]* 21.5 Write property test for ELO formula
    - **Property 31: ELO formula correctness**
    - **Validates: Requirements 8.11**
  
  - [x] 21.6 Implement rating update on game completion
    - Update both players' ratings after rated games
    - Update within 5 seconds of game completion
    - Maintain separate ratings per time control
    - Update games played, wins, losses, draws
    - _Requirements: 8.5, 8.6, 8.7_
  
  - [x]* 21.7 Write property test for rating update timeliness
    - **Property 30: Rating update timeliness**
    - **Validates: Requirements 8.6**
  
  - [x] 21.8 Implement rating history tracking
    - Record rating changes in rating_history table
    - Link to game that caused change
    - Store rating before and after
    - _Requirements: 8.8_
  
  - [x] 21.9 Implement provisional rating logic
    - Mark ratings as provisional for < 20 games
    - Display provisional indicator
    - Prevent ratings from falling below 100
    - Track peak rating
    - _Requirements: 8.9, 8.10_


- [x] 22. Create tournament CRUD and configuration
  - [x] 22.1 Create tournament creation endpoint
    - Implement POST /api/tournaments endpoint
    - Validate tournament configuration
    - Support all tournament formats (Swiss, Round Robin, Single/Double Elimination, Arena)
    - Generate unique share link and QR code
    - _Requirements: 9.1-9.6, 9.16_
  
  - [x]* 22.2 Write property test for unique tournament links
    - **Property 32: Unique tournament links**
    - **Validates: Requirements 9.16**
  
  - [x] 22.2 Implement tournament configuration options
    - Set min/max players (4-1000)
    - Configure time controls
    - Set rated/unrated
    - Configure rounds for Swiss
    - Set pairing method (automatic/manual)
    - Configure tiebreak criteria
    - Set late registration option
    - Set spectator delay
    - _Requirements: 9.7-9.15_
  
  - [x] 22.3 Create tournament retrieval endpoints
    - Implement GET /api/tournaments with filters and pagination
    - Implement GET /api/tournaments/:id with full details
    - Include players, standings, pairings
    - _Requirements: 9.1_
  
  - [x] 22.4 Implement tournament update endpoint
    - Allow Tournament_Admin to update tournament details
    - Prevent changes after tournament starts
    - _Requirements: 9.1_


- [x] 23. Implement tournament lifecycle management
  - [x] 23.1 Implement tournament status transitions
    - Create state machine for tournament statuses
    - Implement transitions: Created → Registration Open → Registration Closed → In Progress → Round In Progress → Round Completed → Completed
    - Validate status transitions
    - _Requirements: 10.1-10.7_
  
  - [x] 23.2 Implement tournament registration
    - Create POST /api/tournaments/:id/join endpoint
    - Create DELETE /api/tournaments/:id/leave endpoint
    - Validate registration deadline
    - Check min/max player limits
    - Handle late registration if enabled
    - _Requirements: 10.2, 10.12_
  
  - [x] 23.3 Implement tournament start logic
    - Create POST /api/tournaments/:id/start endpoint (admin only)
    - Validate minimum players reached
    - Auto-cancel if minimum not reached by start time
    - Transition to "In Progress" status
    - _Requirements: 10.4, 10.13_
  
  - [x] 23.4 Implement tournament cancellation
    - Create POST /api/tournaments/:id/cancel endpoint (admin only)
    - Allow cancellation only before start
    - Notify all registered players within 5 minutes
    - _Requirements: 10.8, 10.9_
  
  - [x] 23.5 Implement tournament pause/resume
    - Allow admin to pause ongoing rounds
    - Allow admin to resume paused rounds
    - _Requirements: 10.10, 10.11_


- [x] 24. Implement tournament pairing algorithms
  - [x] 24.1 Implement Swiss System pairing
    - Pair players with same score
    - Avoid repeat pairings
    - Handle odd number of players with bye
    - Assign bye only once per player
    - _Requirements: 11.1, 11.2, 11.7, 11.8_
  
  - [x] 24.2 Write unit tests for Swiss pairing
    - Test pairing by score
    - Test no repeat pairings
    - Test bye assignment
    - _Requirements: 11.1, 11.2, 11.7, 11.8, 33.8_
  
  - [ ]* 24.3 Write property test for Swiss pairing by score
    - **Property 33: Swiss pairing by score**
    - **Validates: Requirements 11.1**
  
  - [ ]* 24.4 Write property test for no repeat pairings
    - **Property 34: No repeat pairings in Swiss**
    - **Validates: Requirements 11.2**
  
  - [x] 24.5 Implement Round Robin pairing
    - Generate schedule where each player faces every other player once
    - Create all pairings upfront
    - _Requirements: 11.3_
  
  - [x] 24.6 Implement Single Elimination pairing
    - Pair winners in next round
    - Create bracket structure
    - Handle byes in first round if needed
    - _Requirements: 11.4_
  
  - [x] 24.7 Implement Double Elimination pairing
    - Maintain winners and losers brackets
    - Move losers to losers bracket
    - Handle grand finals
    - _Requirements: 11.5_
  
  - [x] 24.8 Implement Arena mode pairing
    - Allow players to start new games immediately after finishing
    - Match available players continuously
    - _Requirements: 11.6_
  
  - [x] 24.9 Implement manual pairing override
    - Allow admin to create custom pairings
    - Validate manual pairings
    - _Requirements: 11.9_
  
  - [x] 24.10 Create pairing notification system
    - Notify paired players within 30 seconds
    - Create game rooms for all pairings
    - Auto-forfeit if player doesn't join within 5 minutes
    - _Requirements: 11.10, 11.11, 11.12_


- [ ] 25. Implement tournament standings and results
  - [x] 25.1 Create standings calculation service
    - Calculate total points (1 for win, 0.5 for draw, 0 for loss)
    - Calculate Buchholz tiebreak score
    - Calculate Sonneborn-Berger tiebreak score
    - Apply configured tiebreak criteria
    - Rank players by points and tiebreaks
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 25.2 Implement real-time standings updates
    - Update standings after each game completes
    - Broadcast standings to all tournament participants
    - _Requirements: 12.1_
  
  - [ ] 25.3 Create standings display endpoint
    - Implement GET /api/tournaments/:id/standings
    - Include wins, losses, draws, points, tiebreaks, rank
    - _Requirements: 12.4_
  
  - [ ] 25.4 Create pairings display endpoint
    - Implement GET /api/tournaments/:id/pairings with round filter
    - Display pairing table for Swiss/Round Robin
    - Display bracket for elimination tournaments
    - _Requirements: 12.5, 12.6_
  
  - [ ] 25.5 Implement tournament results export
    - Generate final results report
    - Export as CSV format
    - Export as PDF format
    - _Requirements: 12.9, 12.10_
  
  - [ ] 25.6 Create tournament history tracking
    - Record player participation in tournaments
    - Track placements and performance
    - Display on player profiles
    - _Requirements: 12.11_
  
  - [ ] 25.7 Implement prize/title awards
    - Award prizes to top finishers as configured
    - Display awards on tournament results
    - _Requirements: 12.12_


- [ ] 26. Create tournament UI components
  - [ ] 26.1 Create tournament list page
    - Build TournamentsListPage with filters
    - Create TournamentCard component
    - Implement pagination
    - Add Create Tournament button for admins
    - _Requirements: 9.1_
  
  - [ ] 26.2 Create tournament creation form
    - Build CreateTournamentPage
    - Create TournamentForm with all configuration options
    - Implement form validation
    - Handle banner image upload
    - _Requirements: 9.1-9.16_
  
  - [ ] 26.3 Create tournament details page
    - Build TournamentDetailsPage
    - Create TournamentHeader with banner and info
    - Create tabs for Overview, Standings, Pairings, Games
    - Add Join/Leave tournament buttons
    - _Requirements: 12.5, 12.6, 12.7, 12.8_
  
  - [ ] 26.4 Create standings table component
    - Build StandingsTable with sortable columns
    - Display rank, player, points, wins/losses/draws, tiebreaks
    - Highlight current user
    - Update in real-time
    - _Requirements: 12.1-12.4_
  
  - [ ] 26.5 Create bracket visualization component
    - Build BracketView for elimination tournaments
    - Display winners and losers brackets
    - Show match results
    - _Requirements: 12.5_
  
  - [ ] 26.6 Create Tournament Gateway for WebSocket
    - Implement join_tournament event handler
    - Broadcast tournament_started event
    - Broadcast round_started with pairings
    - Broadcast pairing_announced to individual players
    - Broadcast standings_updated
    - Broadcast tournament_completed
    - _Requirements: 10.4, 10.5, 10.6, 10.7, 12.1_

- [ ] 27. Checkpoint - Tournament system complete
  - Ensure all tests pass, ask the user if questions arise.


### PHASE 5: SOCIAL & PROFILE (Week 10-11)

- [ ] 28. Implement user profiles and statistics
  - [ ] 28.1 Create user profile endpoints
    - Implement GET /api/users/me for current user
    - Implement GET /api/users/:userId for public profiles
    - Implement PATCH /api/users/me for profile updates
    - Include ratings, statistics, recent games, achievements
    - _Requirements: 16.1, 16.2, 16.3_
  
  - [ ] 28.2 Implement avatar upload
    - Create POST /api/users/me/avatar endpoint
    - Integrate with Cloudinary for image storage
    - Resize and optimize images (400x400)
    - Limit file size to 5MB
    - _Requirements: 1.12_
  
  - [ ] 28.3 Create user settings endpoint
    - Implement PATCH /api/users/me/settings
    - Update theme, board theme, piece set, sound preferences
    - Update notification preferences
    - _Requirements: 22.3, 22.4, 23.15_
  
  - [ ] 28.4 Implement detailed statistics calculation
    - Calculate win/loss/draw distribution
    - Calculate performance by time control
    - Calculate most played openings with win rates
    - Calculate average accuracy
    - Calculate time management stats
    - Calculate best/worst days of week
    - Calculate total time spent playing
    - Calculate longest winning streak
    - _Requirements: 30.1-30.12_
  
  - [ ] 28.5 Create statistics endpoints
    - Implement GET /api/users/:userId/stats
    - Support filtering by date range and time control
    - _Requirements: 30.13, 30.14_


- [ ] 29. Implement game history and replay
  - [ ] 29.1 Create game history page
    - Build GameHistoryPage with filters
    - Implement filtering by opponent, result, time control, date range
    - Add pagination
    - Display game cards with key info
    - _Requirements: 14.8_
  
  - [ ] 29.2 Create game replay page
    - Build GameReplayPage with board in replay mode
    - Implement move navigation (forward, back, first, last)
    - Display move list with clickable moves
    - Show game info and result
    - _Requirements: 14.9_
  
  - [ ] 29.3 Implement game sharing
    - Generate shareable links for completed games
    - Create public game view page
    - _Requirements: 14.11_
  
  - [ ] 29.4 Create spectator mode
    - Allow browsing ongoing games
    - Display live game board with real-time updates
    - Show player info, clocks, move list
    - Display spectator count
    - Implement spectator delay if configured
    - _Requirements: 13.1-13.12_


- [ ] 30. Implement leaderboards
  - [ ] 30.1 Create leaderboard calculation service
    - Calculate top 100 players per time control
    - Require minimum 20 games to appear
    - Cache leaderboards in Redis
    - Update within 10 seconds of game completion
    - _Requirements: 20.1, 20.2, 20.9_
  
  - [ ] 30.2 Create leaderboard endpoints
    - Implement GET /api/leaderboards/:timeControl
    - Implement GET /api/leaderboards/:timeControl/college/:domain
    - Implement GET /api/leaderboards/weekly
    - Support pagination
    - Include rank, name, rating, games played, rating trend
    - _Requirements: 20.1, 20.3, 20.4, 20.6, 20.7, 20.10_
  
  - [ ] 30.3 Create leaderboard page
    - Build LeaderboardPage with time control tabs
    - Display top 100 players
    - Highlight current user position
    - Implement player search
    - Show college-specific leaderboards
    - _Requirements: 20.1, 20.5, 20.6, 20.8_

- [ ] 31. Implement achievements system
  - [ ] 31.1 Create achievements seed data
    - Define all achievements in database
    - Include gameplay, tournament, rating, and social achievements
    - Set icons, descriptions, and point values
    - _Requirements: 17.1-17.19_
  
  - [ ] 31.2 Implement achievement detection service
    - Check for achievement conditions after game/tournament events
    - Award achievements when conditions met
    - Prevent duplicate awards
    - _Requirements: 17.1-17.19_
  
  - [ ] 31.3 Create achievement notification
    - Send notification immediately when achievement earned
    - Display achievement unlock animation
    - _Requirements: 17.20_
  
  - [ ] 31.4 Create achievements display
    - Show earned achievements on profile
    - Display achievement progress
    - Show hidden achievements after unlock
    - _Requirements: 16.8_


- [ ] 32. Implement notification system
  - [ ] 32.1 Create notification service
    - Create notification creation methods for all event types
    - Store notifications in database
    - Track read/unread status
    - _Requirements: 18.1-18.12_
  
  - [ ] 32.2 Create notification endpoints
    - Implement GET /api/notifications with pagination
    - Implement PATCH /api/notifications/:id/read
    - Implement PATCH /api/notifications/read-all
    - Implement DELETE /api/notifications/:id
    - _Requirements: 18.1_
  
  - [ ] 32.3 Create Notification Gateway for WebSocket
    - Implement subscribe_notifications event
    - Broadcast notification events to users
    - Broadcast achievement_unlocked events
    - Broadcast friend_online events
    - Broadcast challenge_received events
    - _Requirements: 18.1-18.12_
  
  - [ ] 32.4 Implement browser push notifications
    - Set up service worker for push notifications
    - Request notification permissions
    - Send push notifications for key events
    - _Requirements: 18.13_
  
  - [ ] 32.5 Implement email notifications
    - Send tournament confirmation emails
    - Send tournament reminder emails (5 minutes before)
    - Send weekly summary emails
    - Send security event emails
    - _Requirements: 18.17, 18.18, 18.19_
  
  - [ ] 32.6 Create notification preferences UI
    - Allow configuring preferences per notification type
    - Implement Do Not Disturb mode
    - _Requirements: 18.15, 18.16_
  
  - [ ] 32.7 Create notification bell component
    - Display unread count
    - Show notification list dropdown
    - Mark as read on click
    - _Requirements: 18.1_


- [ ] 33. Implement social features
  - [ ] 33.1 Create follow system endpoints
    - Implement POST /api/follows/:userId to follow user
    - Implement DELETE /api/follows/:userId to unfollow
    - Implement GET /api/follows/followers
    - Implement GET /api/follows/following
    - _Requirements: 31.1, 31.2, 31.7, 31.8_
  
  - [ ] 33.2 Implement follow notifications
    - Notify when followed player comes online
    - Display followed players on dashboard
    - Show online status for followed players
    - _Requirements: 31.3, 31.4, 31.5_
  
  - [ ] 33.3 Implement direct challenges to friends
    - Allow sending challenges to followed players
    - Display mutual followers separately
    - _Requirements: 31.6, 31.7_
  
  - [ ] 33.4 Implement block system
    - Create POST /api/blocks/:userId endpoint
    - Create DELETE /api/blocks/:userId endpoint
    - Prevent blocked users from sending challenges/messages
    - _Requirements: 31.9, 31.10_
  
  - [ ] 33.5 Implement player search
    - Create GET /api/users/search endpoint
    - Search by name or username
    - Display suggested players based on rating/college
    - _Requirements: 31.11, 31.12_

- [ ] 34. Create profile UI components
  - [ ] 34.1 Create profile page
    - Build ProfilePage with header and tabs
    - Create ProfileHeader with avatar, info, ratings, follow button
    - Create tabs for Overview, Games, Tournaments, Stats
    - _Requirements: 16.1-16.15_
  
  - [ ] 34.2 Create rating chart component
    - Build RatingChart showing rating history over time
    - Support all time controls
    - Display peak rating
    - _Requirements: 16.4_
  
  - [ ] 34.3 Create statistics dashboard
    - Display stat cards for key metrics
    - Create performance charts
    - Display opening statistics
    - Show time management stats
    - _Requirements: 30.1-30.12_
  
  - [ ] 34.4 Create settings page
    - Build SettingsPage with tabs
    - Create Profile, Appearance, Sound, Notifications, Security tabs
    - Implement all settings controls
    - _Requirements: 22.2-22.4, 23.12-23.15_

- [ ] 35. Checkpoint - Social and profile complete
  - Ensure all tests pass, ask the user if questions arise.


### PHASE 6: GAME ANALYSIS (Week 12)

- [ ] 36. Integrate Stockfish chess engine
  - [ ] 36.1 Set up Stockfish WASM
    - Add Stockfish WASM files to public directory
    - Create Stockfish worker wrapper
    - Implement UCI protocol communication
    - _Requirements: 15.1_
  
  - [ ] 36.2 Create analysis service
    - Implement position evaluation
    - Implement best move calculation
    - Implement multi-variation analysis
    - Run analysis client-side to minimize server load
    - _Requirements: 15.12_
  
  - [ ] 36.3 Implement move classification
    - Classify moves as brilliant, great, good, inaccuracy, mistake, blunder
    - Calculate centipawn loss per move
    - Identify key moments with significant evaluation changes
    - _Requirements: 15.3, 15.6, 15.10_
  
  - [ ] 36.4 Implement accuracy calculation
    - Calculate accuracy percentage for each player
    - Display accuracy on analysis page
    - _Requirements: 15.4_
  
  - [ ] 36.5 Implement opening identification
    - Identify opening played
    - Display opening name
    - _Requirements: 15.5_
  
  - [ ] 36.6 Create analysis request endpoint
    - Implement POST /api/games/:id/analyze
    - Queue analysis job
    - Complete within 60 seconds for games up to 50 moves
    - _Requirements: 15.2_


- [ ] 37. Create analysis UI components
  - [ ] 37.1 Create analysis panel component
    - Build AnalysisPanel with evaluation display
    - Create EvaluationBar showing position evaluation
    - Display best move suggestions
    - Show move classification (brilliant, mistake, blunder, etc.)
    - _Requirements: 15.3, 15.7_
  
  - [ ] 37.2 Create accuracy chart component
    - Build AccuracyChart showing accuracy over time
    - Display both players' accuracy
    - _Requirements: 15.4_
  
  - [ ] 37.3 Create win probability graph
    - Build graph showing evaluation throughout game
    - Highlight key moments
    - _Requirements: 15.8_
  
  - [ ] 37.4 Create mistakes and blunders list
    - Display list of mistakes and blunders
    - Show alternative better moves
    - Allow jumping to position
    - _Requirements: 15.7_
  
  - [ ] 37.5 Implement analysis navigation
    - Allow navigating through game with engine evaluation
    - Display evaluation at each position
    - Show best move at each position
    - _Requirements: 15.9_
  
  - [ ] 37.6 Create analysis export
    - Export analysis report as PDF
    - Include all key metrics and insights
    - _Requirements: 15.11_

- [ ] 38. Checkpoint - Analysis complete
  - Ensure all tests pass, ask the user if questions arise.


### PHASE 7: ADMIN PANEL (Week 13)

- [ ] 39. Implement admin dashboard and analytics
  - [ ] 39.1 Create admin dashboard endpoint
    - Implement GET /api/admin/dashboard
    - Calculate total users, DAU, WAU, MAU
    - Calculate total games, average duration, popular time controls
    - Calculate peak usage hours, new registrations
    - Calculate tournament participation rates
    - Include server performance metrics
    - Require super_admin role
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.18_
  
  - [ ] 39.2 Create admin dashboard page
    - Build AdminDashboardPage
    - Display metrics cards
    - Create usage charts
    - Show recent activity feed
    - _Requirements: 25.1-25.4_

- [ ] 40. Implement user management
  - [ ] 40.1 Create user management endpoints
    - Implement GET /api/admin/users with search and pagination
    - Implement PATCH /api/admin/users/:userId for updates
    - Implement POST /api/admin/users/:userId/reset-password
    - Allow editing profiles, roles, ban status
    - Require super_admin role
    - _Requirements: 25.5, 25.6, 25.7, 25.8, 25.18_
  
  - [ ] 40.2 Create user management page
    - Build UserManagementPage
    - Create user search and filters
    - Display user table with actions
    - Implement user edit modal
    - _Requirements: 25.5-25.8_
  
  - [ ] 40.3 Implement college domain management
    - Create endpoint to manage approved college domains
    - Allow adding/removing domains
    - _Requirements: 25.16_


- [ ] 41. Implement tournament management for admins
  - [ ] 41.1 Create tournament management endpoints
    - Implement GET /api/admin/tournaments
    - Allow viewing all tournaments
    - Allow canceling or modifying any tournament
    - Require super_admin role
    - _Requirements: 25.9, 25.10, 25.18_
  
  - [ ] 41.2 Create tournament management page
    - Build TournamentManagementPage
    - Display tournament table with filters
    - Implement tournament actions menu
    - _Requirements: 25.9, 25.10_

- [ ] 42. Implement moderation and reporting
  - [ ] 42.1 Create report submission endpoint
    - Implement POST /api/reports
    - Support reporting users, games, chat
    - Store report details
    - _Requirements: 19.7, 24.14_
  
  - [ ] 42.2 Create report management endpoints
    - Implement GET /api/admin/reports with filters
    - Implement PATCH /api/admin/reports/:id for status updates
    - Allow viewing chat logs
    - Require super_admin role
    - _Requirements: 25.12, 25.13, 25.18_
  
  - [ ] 42.3 Create moderation page
    - Build ModerationPage
    - Display reports list with filters
    - Create report detail view
    - Implement moderation actions
    - _Requirements: 25.12, 25.13_
  
  - [ ] 42.4 Implement anti-cheat detection
    - Track move times for suspiciously fast moves
    - Detect browser tab focus loss during games
    - Detect chess analysis browser extensions
    - Perform statistical analysis on move patterns
    - Flag suspicious accounts for review
    - _Requirements: 24.10, 24.11, 24.12, 24.13_
  
  - [ ] 42.5 Implement ban and rating rollback
    - Allow issuing warnings, temporary bans, permanent bans
    - Allow rolling back rating changes from affected games
    - _Requirements: 24.16, 24.17_


- [ ] 43. Implement announcements and system management
  - [ ] 43.1 Create announcement system
    - Implement POST /api/admin/announcements
    - Broadcast announcements to all users
    - Display on dashboard
    - Require super_admin role
    - _Requirements: 25.11, 25.18_
  
  - [ ] 43.2 Create system logs and monitoring
    - Implement GET /api/admin/logs
    - Display error reports and system logs
    - Require super_admin role
    - _Requirements: 25.15, 25.18_
  
  - [ ] 43.3 Implement manual rating adjustment
    - Create POST /api/admin/ratings/:userId/adjust
    - Allow adjusting ratings with reason
    - Require super_admin role
    - _Requirements: 25.14, 25.18_
  
  - [ ] 43.4 Create data export functionality
    - Implement user data export
    - Implement analytics reports export
    - Support CSV and PDF formats
    - _Requirements: 25.17_

- [ ] 44. Checkpoint - Admin panel complete
  - Ensure all tests pass, ask the user if questions arise.


### PHASE 8: MOBILE OPTIMIZATION (Week 14-15)

- [ ] 45. Implement responsive design
  - [ ] 45.1 Make all pages responsive
    - Ensure correct rendering from 320px to 2560px width
    - Test on mobile, tablet, and desktop breakpoints
    - Adapt layouts for portrait and landscape
    - _Requirements: 21.1, 21.8_
  
  - [ ] 45.2 Implement mobile navigation
    - Create bottom navigation for mobile
    - Adapt header for mobile screens
    - Implement hamburger menu
    - _Requirements: 21.9_
  
  - [ ] 45.3 Optimize chess board for mobile
    - Implement touch gestures for piece movement
    - Support drag-and-drop on touch devices
    - Support tap-tap move input
    - Add piece confirmation dialog for touch
    - _Requirements: 21.2, 21.3_
  
  - [ ] 45.4 Implement mobile-specific gestures
    - Support swipe for move history navigation
    - Support pinch-to-zoom for board
    - Support long-press for move options
    - Support pull-to-refresh
    - _Requirements: 21.5, 21.6, 21.7, 21.10_
  
  - [ ] 45.5 Add haptic feedback
    - Implement haptic feedback on piece moves
    - Add haptic for captures and check
    - _Requirements: 21.4_


- [ ] 46. Implement Progressive Web App (PWA)
  - [ ] 46.1 Configure PWA manifest
    - Create manifest.json with app metadata
    - Add app icons for all sizes
    - Configure display mode and theme colors
    - _Requirements: 21.11_
  
  - [ ] 46.2 Implement service worker
    - Create service worker for offline functionality
    - Cache static assets
    - Implement cache-first strategy for assets
    - _Requirements: 21.14_
  
  - [ ] 46.3 Implement offline functionality
    - Allow viewing past games offline
    - Allow viewing profile offline
    - Display offline indicator
    - _Requirements: 21.12_
  
  - [ ] 46.4 Implement PWA install prompt
    - Display install prompt on supported browsers
    - Handle install acceptance
    - Track installation
    - _Requirements: 21.15_
  
  - [ ] 46.5 Implement PWA push notifications
    - Configure push notification service
    - Request notification permissions
    - Handle push notification display
    - _Requirements: 21.13_

- [ ] 47. Implement native mobile apps (optional)
  - [ ] 47.1 Set up React Native project
    - Initialize React Native project
    - Configure for iOS and Android
    - Set up navigation
    - _Requirements: 29.1_
  
  - [ ] 47.2 Implement core features in native app
    - Port all web features to native
    - Implement native navigation
    - Integrate with native APIs
    - _Requirements: 29.2_
  
  - [ ] 47.3 Implement offline mode for native
    - Support offline game viewing
    - Support offline play against computer
    - Sync data when connection restored
    - _Requirements: 29.3, 29.4, 29.5_
  
  - [ ] 47.4 Implement native push notifications
    - Configure native push notification services
    - Handle notification display and actions
    - Support background game notifications
    - _Requirements: 29.6, 29.7_
  
  - [ ] 47.5 Optimize for mobile performance
    - Optimize battery usage
    - Optimize data usage
    - Implement efficient protocols
    - _Requirements: 29.8, 29.9_
  
  - [ ] 47.6 Implement biometric authentication
    - Support fingerprint authentication
    - Support face recognition
    - _Requirements: 29.10_
  
  - [ ] 47.7 Implement device integration
    - Support device rotation
    - Integrate with share functionality
    - Adapt UI for different screen sizes
    - _Requirements: 29.11, 29.12, 29.13_
  
  - [ ] 47.8 Publish to app stores
    - Prepare app store listings
    - Submit to Apple App Store
    - Submit to Google Play Store
    - _Requirements: 29.14_

- [ ] 48. Checkpoint - Mobile optimization complete
  - Ensure all tests pass, ask the user if questions arise.


### PHASE 9: POLISH & DEPLOY (Week 16)

- [ ] 49. Implement security measures
  - [ ] 49.1 Configure HTTPS and secure WebSocket
    - Set up SSL/TLS certificates
    - Configure automatic certificate renewal
    - Force HTTPS for all connections
    - Use WSS for WebSocket connections
    - _Requirements: 24.2, 24.3, 34.10_
  
  - [ ] 49.2 Implement rate limiting
    - Add rate limiting to all API endpoints (100 req/min per user)
    - Add rate limiting to WebSocket events
    - Return 429 status for exceeded limits
    - _Requirements: 24.4_
  
  - [ ] 49.3 Implement input validation and sanitization
    - Validate all user inputs
    - Sanitize inputs to prevent SQL injection
    - Sanitize inputs to prevent XSS attacks
    - _Requirements: 24.5, 24.6_
  
  - [ ] 49.4 Implement CSRF and CORS protection
    - Add CSRF tokens to state-changing operations
    - Configure CORS to allow only approved domains
    - _Requirements: 24.7, 24.8_
  
  - [ ] 49.5 Implement data encryption
    - Encrypt sensitive data at rest
    - Use bcrypt for password hashing
    - _Requirements: 24.9_
  
  - [ ] 49.6 Implement DDoS protection
    - Configure DDoS protection at network level
    - Set up rate limiting and IP blocking
    - _Requirements: 24.19_
  
  - [ ] 49.7 Conduct security audit
    - Run security vulnerability scan
    - Review authentication and authorization
    - Test for common vulnerabilities (OWASP Top 10)
    - _Requirements: 24.20_


- [ ] 50. Implement error handling and recovery
  - [ ] 50.1 Implement global error handling
    - Create HTTP exception filter
    - Create WebSocket error handlers
    - Return consistent error response format
    - Log all errors with context
    - _Requirements: 32.1, 32.7_
  
  - [ ] 50.2 Implement graceful degradation
    - Handle offline mode for PWA
    - Display appropriate error states
    - Show maintenance mode page
    - _Requirements: 32.9_
  
  - [ ] 50.3 Implement retry logic
    - Retry failed database queries (3 attempts with exponential backoff)
    - Retry failed WebSocket connections (5 attempts every 3 seconds)
    - _Requirements: 32.5, 32.6_
  
  - [ ] 50.4 Implement error monitoring and alerting
    - Set up error tracking (Sentry or similar)
    - Send alerts to administrators on critical errors
    - _Requirements: 32.8_
  
  - [ ] 50.5 Implement user-friendly error messages
    - Display actionable error messages
    - Show specific validation errors
    - _Requirements: 32.10, 32.11_
  
  - [ ] 50.6 Implement circuit breaker pattern
    - Add circuit breakers for external service calls
    - Handle service outages gracefully
    - _Requirements: 32.12_


- [ ] 51. Implement comprehensive testing
  - [ ] 51.1 Write unit tests for all critical logic
    - Test chess engine move validation
    - Test special moves (castling, en passant, promotion)
    - Test draw conditions
    - Test ELO calculations
    - Achieve 80% code coverage minimum
    - _Requirements: 33.1-33.4, 33.13_
  
  - [ ] 51.2 Write API integration tests
    - Test all REST endpoints
    - Test authentication and authorization
    - Test error responses
    - _Requirements: 33.5_
  
  - [ ] 51.3 Write WebSocket integration tests
    - Test real-time game functionality
    - Test disconnection and reconnection
    - _Requirements: 33.6, 33.11_
  
  - [ ] 51.4 Write end-to-end tests
    - Test complete game scenarios
    - Test tournament creation and management
    - _Requirements: 33.7, 33.8_
  
  - [ ] 51.5 Write load tests
    - Test 100 concurrent games
    - Test 1000 simultaneous tournament games
    - _Requirements: 33.9, 33.10_
  
  - [ ] 51.6 Set up continuous integration
    - Configure CI pipeline to run tests on every commit
    - Block merge if tests fail
    - Generate coverage reports
    - _Requirements: 33.14, 34.2_


- [ ] 52. Optimize performance
  - [ ] 52.1 Optimize frontend performance
    - Implement code splitting
    - Optimize images (70% size reduction)
    - Use server-side rendering for initial loads
    - Compress HTTP responses (gzip/brotli)
    - Achieve < 2 second initial page load on 4G
    - _Requirements: 26.1, 26.9, 26.10, 26.11, 26.12_
  
  - [ ] 52.2 Optimize database performance
    - Add missing indexes
    - Optimize slow queries
    - Implement connection pooling (10-100 connections)
    - Achieve < 50ms query time for 95% of requests
    - _Requirements: 26.5, 26.15_
  
  - [ ] 52.3 Implement caching strategy
    - Cache leaderboards in Redis
    - Cache user sessions
    - Cache static assets with CDN
    - Set appropriate cache headers
    - _Requirements: 26.13, 26.14_
  
  - [ ] 52.4 Optimize WebSocket performance
    - Minimize message payload size
    - Implement binary protocol if needed
    - Support 500 concurrent games
    - Support 1000 concurrent WebSocket connections
    - _Requirements: 6.7, 6.8, 26.3, 26.4_
  
  - [ ] 52.5 Optimize animations and rendering
    - Ensure 60 FPS for all animations
    - Optimize touch input response (< 50ms)
    - Prevent memory leaks
    - _Requirements: 22.5, 26.6, 26.7, 26.8_


- [ ] 53. Implement accessibility features
  - [ ] 53.1 Add keyboard navigation support
    - Ensure all interactive elements are keyboard accessible
    - Implement focus management
    - Add keyboard shortcuts
    - _Requirements: 22.10_
  
  - [ ] 53.2 Add screen reader support
    - Add ARIA labels to all components
    - Provide alt text for all images
    - Ensure proper heading hierarchy
    - _Requirements: 22.11, 22.14_
  
  - [ ] 53.3 Implement high contrast mode
    - Support high contrast mode
    - Use color-blind friendly colors
    - _Requirements: 22.12, 22.15_
  
  - [ ] 53.4 Add font size adjustment
    - Allow adjusting font size (12px-20px)
    - Ensure layout adapts to font size changes
    - _Requirements: 22.13_

- [ ] 54. Set up monitoring and logging
  - [ ] 54.1 Configure application monitoring
    - Set up error tracking (Sentry)
    - Set up performance monitoring (New Relic/DataDog)
    - Set up uptime monitoring (Pingdom)
    - _Requirements: 34.6_
  
  - [ ] 54.2 Implement logging infrastructure
    - Set up centralized log aggregation (ELK Stack)
    - Implement structured JSON logging
    - Configure log retention (90 days)
    - _Requirements: 34.8_
  
  - [ ] 54.3 Set up metrics and alerting
    - Track API response times, error rates, active connections
    - Track custom business metrics (games played, users online)
    - Configure alerts for high error rates, slow responses, downtime
    - _Requirements: 34.6, 34.7, 34.9_
  
  - [ ] 54.4 Create health check endpoints
    - Implement /health endpoint
    - Check database connectivity
    - Check Redis connectivity
    - _Requirements: 34.11_


- [ ] 55. Implement backup and disaster recovery
  - [ ] 55.1 Set up automated database backups
    - Configure daily automated backups
    - Store backups in geographically separate locations
    - Retain backups for 30 days minimum
    - _Requirements: 27.6, 27.7, 27.8_
  
  - [ ] 55.2 Implement database replication
    - Set up database replication for high availability
    - Configure read replicas
    - _Requirements: 27.11_
  
  - [ ] 55.3 Test backup restoration
    - Test backup restoration procedures monthly
    - Document recovery procedures
    - _Requirements: 27.9_
  
  - [ ] 55.4 Implement audit logging
    - Log all critical operations
    - Store audit logs securely
    - _Requirements: 27.12_

- [ ] 56. Deploy to production
  - [ ] 56.1 Set up production infrastructure
    - Configure production servers (Vercel/AWS)
    - Set up PostgreSQL database
    - Set up Redis cache
    - Configure CDN for static assets
    - _Requirements: 34.12_
  
  - [ ] 56.2 Configure CI/CD pipeline
    - Set up continuous integration
    - Set up continuous deployment
    - Deploy to staging before production
    - Implement blue-green deployment
    - _Requirements: 34.2, 34.3, 34.4, 34.5_
  
  - [ ] 56.3 Configure domain and SSL
    - Register domain name
    - Configure DNS records
    - Set up SSL/TLS certificates with auto-renewal
    - _Requirements: 34.10_
  
  - [ ] 56.4 Configure auto-scaling
    - Implement automatic scaling based on traffic load
    - Configure scaling policies
    - _Requirements: 34.13_
  
  - [ ] 56.5 Perform load testing
    - Test with expected production load
    - Test with 2x expected load
    - Identify and fix bottlenecks
    - _Requirements: 26.3, 26.4_
  
  - [ ] 56.6 Verify 99.9% uptime target
    - Monitor uptime over test period
    - Ensure redundancy and failover
    - _Requirements: 34.14_

- [ ] 57. Final checkpoint - Production ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation at phase boundaries
- All implementation uses TypeScript with Next.js (frontend) and NestJS (backend)

