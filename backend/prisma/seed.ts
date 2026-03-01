import { PrismaClient, UserRole, TimeControl, GameStatus, GameResult, TournamentFormat, TournamentStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Approved college domains list
const APPROVED_COLLEGE_DOMAINS = [
  'stanford.edu',
  'mit.edu',
  'harvard.edu',
  'berkeley.edu',
  'caltech.edu',
  'princeton.edu',
  'yale.edu',
  'columbia.edu',
  'uchicago.edu',
  'upenn.edu',
  'cornell.edu',
  'duke.edu',
  'northwestern.edu',
  'jhu.edu',
  'brown.edu',
  'vanderbilt.edu',
  'rice.edu',
  'wustl.edu',
  'georgetown.edu',
  'emory.edu',
];

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning existing data...');
  await prisma.chatMessage.deleteMany();
  await prisma.gameMove.deleteMany();
  await prisma.ratingHistory.deleteMany();
  await prisma.tournamentPairing.deleteMany();
  await prisma.tournamentPlayer.deleteMany();
  await prisma.game.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.report.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  console.log('👤 Creating admin user...');
  const adminPassword = await hashPassword('Admin123!');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@stanford.edu',
      username: 'admin',
      passwordHash: adminPassword,
      displayName: 'Platform Administrator',
      collegeName: 'Stanford University',
      collegeDomain: 'stanford.edu',
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
      bio: 'ChessArena platform administrator',
      country: 'United States',
      city: 'Palo Alto',
    },
  });

  // Create tournament admin
  console.log('👤 Creating tournament admin...');
  const tournamentAdminPassword = await hashPassword('TournamentAdmin123!');
  const tournamentAdmin = await prisma.user.create({
    data: {
      email: 'tournament.admin@mit.edu',
      username: 'tournament_admin',
      passwordHash: tournamentAdminPassword,
      displayName: 'Tournament Organizer',
      collegeName: 'Massachusetts Institute of Technology',
      collegeDomain: 'mit.edu',
      role: UserRole.TOURNAMENT_ADMIN,
      emailVerified: true,
      bio: 'Chess tournament organizer and enthusiast',
      country: 'United States',
      city: 'Cambridge',
    },
  });

  // Create sample players
  console.log('👥 Creating sample players...');
  const playerPassword = await hashPassword('Player123!');
  
  const players = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice.chen@stanford.edu',
        username: 'alice_chen',
        passwordHash: playerPassword,
        displayName: 'Alice Chen',
        collegeName: 'Stanford University',
        collegeDomain: 'stanford.edu',
        role: UserRole.PLAYER,
        emailVerified: true,
        bio: 'Chess enthusiast and computer science student',
        country: 'United States',
        city: 'Palo Alto',
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob.smith@mit.edu',
        username: 'bob_smith',
        passwordHash: playerPassword,
        displayName: 'Bob Smith',
        collegeName: 'Massachusetts Institute of Technology',
        collegeDomain: 'mit.edu',
        role: UserRole.PLAYER,
        emailVerified: true,
        bio: 'Blitz chess specialist',
        country: 'United States',
        city: 'Cambridge',
      },
    }),
    prisma.user.create({
      data: {
        email: 'carol.johnson@harvard.edu',
        username: 'carol_j',
        passwordHash: playerPassword,
        displayName: 'Carol Johnson',
        collegeName: 'Harvard University',
        collegeDomain: 'harvard.edu',
        role: UserRole.PLAYER,
        emailVerified: true,
        bio: 'Tournament player and chess club president',
        country: 'United States',
        city: 'Cambridge',
      },
    }),
    prisma.user.create({
      data: {
        email: 'david.lee@berkeley.edu',
        username: 'david_lee',
        passwordHash: playerPassword,
        displayName: 'David Lee',
        collegeName: 'University of California, Berkeley',
        collegeDomain: 'berkeley.edu',
        role: UserRole.PLAYER,
        emailVerified: true,
        bio: 'Rapid chess player',
        country: 'United States',
        city: 'Berkeley',
      },
    }),
    prisma.user.create({
      data: {
        email: 'emma.wilson@caltech.edu',
        username: 'emma_w',
        passwordHash: playerPassword,
        displayName: 'Emma Wilson',
        collegeName: 'California Institute of Technology',
        collegeDomain: 'caltech.edu',
        role: UserRole.PLAYER,
        emailVerified: true,
        bio: 'Classical chess enthusiast',
        country: 'United States',
        city: 'Pasadena',
      },
    }),
  ]);

  // Create ratings for all players
  console.log('📊 Creating player ratings...');
  const allUsers = [admin, tournamentAdmin, ...players];
  for (const user of allUsers) {
    await prisma.rating.createMany({
      data: [
        {
          userId: user.id,
          timeControl: TimeControl.BULLET,
          rating: 1200 + Math.floor(Math.random() * 400),
          peakRating: 1200 + Math.floor(Math.random() * 400),
          gamesPlayed: Math.floor(Math.random() * 50),
          wins: Math.floor(Math.random() * 20),
          losses: Math.floor(Math.random() * 20),
          draws: Math.floor(Math.random() * 10),
        },
        {
          userId: user.id,
          timeControl: TimeControl.BLITZ,
          rating: 1200 + Math.floor(Math.random() * 400),
          peakRating: 1200 + Math.floor(Math.random() * 400),
          gamesPlayed: Math.floor(Math.random() * 50),
          wins: Math.floor(Math.random() * 20),
          losses: Math.floor(Math.random() * 20),
          draws: Math.floor(Math.random() * 10),
        },
        {
          userId: user.id,
          timeControl: TimeControl.RAPID,
          rating: 1200 + Math.floor(Math.random() * 400),
          peakRating: 1200 + Math.floor(Math.random() * 400),
          gamesPlayed: Math.floor(Math.random() * 50),
          wins: Math.floor(Math.random() * 20),
          losses: Math.floor(Math.random() * 20),
          draws: Math.floor(Math.random() * 10),
        },
        {
          userId: user.id,
          timeControl: TimeControl.CLASSICAL,
          rating: 1200 + Math.floor(Math.random() * 400),
          peakRating: 1200 + Math.floor(Math.random() * 400),
          gamesPlayed: Math.floor(Math.random() * 50),
          wins: Math.floor(Math.random() * 20),
          losses: Math.floor(Math.random() * 20),
          draws: Math.floor(Math.random() * 10),
        },
      ],
    });
  }

  // Create sample completed games
  console.log('♟️  Creating sample games...');
  const completedGames = await Promise.all([
    prisma.game.create({
      data: {
        whitePlayerId: players[0].id,
        blackPlayerId: players[1].id,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
        status: GameStatus.COMPLETED,
        result: GameResult.WHITE_WIN,
        terminationReason: 'checkmate',
        moveCount: 42,
        whiteRatingBefore: 1350,
        blackRatingBefore: 1320,
        whiteRatingAfter: 1365,
        blackRatingAfter: 1305,
        openingName: "Sicilian Defense: Najdorf Variation",
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      },
    }),
    prisma.game.create({
      data: {
        whitePlayerId: players[2].id,
        blackPlayerId: players[3].id,
        timeControl: TimeControl.RAPID,
        initialTimeMinutes: 10,
        incrementSeconds: 5,
        isRated: true,
        status: GameStatus.COMPLETED,
        result: GameResult.DRAW,
        terminationReason: 'draw_agreement',
        moveCount: 56,
        whiteRatingBefore: 1420,
        blackRatingBefore: 1410,
        whiteRatingAfter: 1420,
        blackRatingAfter: 1410,
        openingName: "Queen's Gambit Declined",
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
      },
    }),
    prisma.game.create({
      data: {
        whitePlayerId: players[4].id,
        blackPlayerId: players[0].id,
        timeControl: TimeControl.BULLET,
        initialTimeMinutes: 1,
        incrementSeconds: 1,
        isRated: true,
        status: GameStatus.COMPLETED,
        result: GameResult.BLACK_WIN,
        terminationReason: 'timeout',
        moveCount: 28,
        whiteRatingBefore: 1280,
        blackRatingBefore: 1350,
        whiteRatingAfter: 1270,
        blackRatingAfter: 1360,
        openingName: "Italian Game",
        startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000 + 3 * 60 * 1000),
      },
    }),
  ]);

  // Create sample tournaments
  console.log('🏆 Creating sample tournaments...');
  const upcomingTournament = await prisma.tournament.create({
    data: {
      name: 'Stanford Spring Championship 2024',
      description: 'Annual spring chess championship for Stanford students. Swiss system tournament with 5 rounds.',
      creatorId: tournamentAdmin.id,
      format: TournamentFormat.SWISS,
      timeControl: TimeControl.RAPID,
      initialTimeMinutes: 15,
      incrementSeconds: 10,
      isRated: true,
      status: TournamentStatus.REGISTRATION_OPEN,
      minPlayers: 8,
      maxPlayers: 32,
      currentPlayers: 3,
      roundsTotal: 5,
      pairingMethod: 'automatic',
      tiebreakCriteria: 'buchholz',
      registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      shareLink: 'stanford-spring-2024',
      prizeDescription: 'Trophy and $500 prize pool',
    },
  });

  const completedTournament = await prisma.tournament.create({
    data: {
      name: 'MIT Blitz Arena - February',
      description: 'Fast-paced blitz tournament. Arena format - play as many games as you can!',
      creatorId: tournamentAdmin.id,
      format: TournamentFormat.ARENA,
      timeControl: TimeControl.BLITZ,
      initialTimeMinutes: 3,
      incrementSeconds: 2,
      isRated: true,
      status: TournamentStatus.COMPLETED,
      minPlayers: 4,
      maxPlayers: 100,
      currentPlayers: 12,
      registrationDeadline: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      startTime: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      shareLink: 'mit-blitz-feb-2024',
    },
  });

  // Register players for upcoming tournament
  console.log('📝 Registering players for tournaments...');
  await prisma.tournamentPlayer.createMany({
    data: [
      {
        tournamentId: upcomingTournament.id,
        userId: players[0].id,
        score: 0,
      },
      {
        tournamentId: upcomingTournament.id,
        userId: players[1].id,
        score: 0,
      },
      {
        tournamentId: upcomingTournament.id,
        userId: players[2].id,
        score: 0,
      },
    ],
  });

  // Create achievements
  console.log('🏅 Creating achievements...');
  await prisma.achievement.createMany({
    data: [
      {
        code: 'first_victory',
        name: 'First Victory',
        description: 'Win your first game',
        category: 'gameplay',
        points: 10,
      },
      {
        code: 'checkmate_master',
        name: 'Checkmate Master',
        description: 'Deliver checkmate in 100 games',
        category: 'gameplay',
        points: 100,
      },
      {
        code: 'speed_demon',
        name: 'Speed Demon',
        description: 'Win a Bullet game',
        category: 'gameplay',
        points: 15,
      },
      {
        code: 'marathon_runner',
        name: 'Marathon Runner',
        description: 'Complete a game lasting over 100 moves',
        category: 'gameplay',
        points: 25,
      },
      {
        code: 'tournament_debut',
        name: 'Tournament Debut',
        description: 'Participate in your first tournament',
        category: 'tournament',
        points: 20,
      },
      {
        code: 'champion',
        name: 'Champion',
        description: 'Win a tournament',
        category: 'tournament',
        points: 100,
      },
      {
        code: 'rising_star',
        name: 'Rising Star',
        description: 'Reach 1400 rating',
        category: 'rating',
        points: 30,
      },
      {
        code: 'club_player',
        name: 'Club Player',
        description: 'Reach 1600 rating',
        category: 'rating',
        points: 50,
      },
      {
        code: 'expert',
        name: 'Expert',
        description: 'Reach 1800 rating',
        category: 'rating',
        points: 75,
      },
      {
        code: 'master',
        name: 'Master',
        description: 'Reach 2000 rating',
        category: 'rating',
        points: 100,
      },
      {
        code: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Follow 10 other players',
        category: 'social',
        points: 15,
      },
    ],
  });

  // Create some follow relationships
  console.log('👥 Creating follow relationships...');
  await prisma.follow.createMany({
    data: [
      { followerId: players[0].id, followingId: players[1].id },
      { followerId: players[0].id, followingId: players[2].id },
      { followerId: players[1].id, followingId: players[0].id },
      { followerId: players[2].id, followingId: players[3].id },
      { followerId: players[3].id, followingId: players[4].id },
    ],
  });

  // Create sample notifications
  console.log('🔔 Creating sample notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: players[0].id,
        type: 'tournament_start',
        title: 'Tournament Starting Soon',
        message: 'Stanford Spring Championship 2024 starts in 10 days',
        linkUrl: `/tournaments/${upcomingTournament.id}`,
      },
      {
        userId: players[1].id,
        type: 'game_challenge',
        title: 'New Game Challenge',
        message: 'Alice Chen has challenged you to a game',
        isRead: false,
      },
      {
        userId: players[2].id,
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: 'You earned the "Tournament Debut" achievement',
        isRead: true,
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Admin user: admin@stanford.edu (password: Admin123!)`);
  console.log(`   - Tournament admin: tournament.admin@mit.edu (password: TournamentAdmin123!)`);
  console.log(`   - ${players.length} sample players (password: Player123!)`);
  console.log(`   - ${completedGames.length} completed games`);
  console.log(`   - 2 tournaments (1 open for registration, 1 completed)`);
  console.log(`   - 11 achievements`);
  console.log(`   - ${APPROVED_COLLEGE_DOMAINS.length} approved college domains`);
  console.log('\n🎓 Approved college domains:');
  APPROVED_COLLEGE_DOMAINS.forEach(domain => console.log(`   - ${domain}`));
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
