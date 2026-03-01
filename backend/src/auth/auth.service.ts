import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  // List of approved college domains
  private readonly APPROVED_DOMAINS = [
    'edu',
    'ac.uk',
    'edu.au',
    'edu.in',
    'ac.in',
    // Add more approved domains as needed
  ];

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<any> {
    const { email, username, password, displayName, collegeName, collegeDomain } = registerDto;

    // Validate college email domain
    this.validateCollegeDomain(email, collegeDomain);

    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Hash password with bcrypt using 10 salt rounds
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Generate email verification token
    const emailVerificationToken = this.generateVerificationToken();

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName,
        collegeName,
        collegeDomain,
        role: 'PLAYER',
        emailVerified: false,
        emailVerificationToken,
      },
    });

    // Create initial ratings for all time controls
    await this.createInitialRatings(user.id);

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, emailVerificationToken, username);
    } catch (error) {
      // Log error but don't fail registration
      console.error('Failed to send verification email:', error);
    }

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(loginDto: LoginDto) {
    const { email, password, rememberMe } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        passwordHash: true,
        role: true,
        isBanned: true,
        emailVerified: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new UnauthorizedException('Your account has been banned');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token with appropriate expiration
    const expiresIn = rememberMe ? '30d' : '24h';

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn,
    });

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      expiresIn,
    };
  }

  private validateCollegeDomain(email: string, collegeDomain: string): void {
    // Extract domain from email
    const emailDomain = email.split('@')[1];

    if (!emailDomain) {
      throw new BadRequestException('Invalid email format');
    }

    // Check if email domain matches the provided college domain
    if (!emailDomain.toLowerCase().includes(collegeDomain.toLowerCase())) {
      throw new BadRequestException('Email domain does not match the provided college domain');
    }

    // Check if the domain ends with an approved educational domain
    const isApprovedDomain = this.APPROVED_DOMAINS.some((approvedDomain) =>
      emailDomain.toLowerCase().endsWith(approvedDomain),
    );

    if (!isApprovedDomain) {
      throw new BadRequestException('Email must be from an approved educational institution');
    }
  }

  private async createInitialRatings(userId: string): Promise<void> {
    const timeControls = ['BULLET', 'BLITZ', 'RAPID', 'CLASSICAL'] as const;

    await Promise.all(
      timeControls.map((timeControl) =>
        this.prisma.rating.create({
          data: {
            userId,
            timeControl,
            rating: 1200,
            peakRating: 1200,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            isProvisional: true,
            kFactor: 40,
          },
        }),
      ),
    );
  }

  /**
   * Generate a secure random verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a secure random password reset token
   */
  private generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify email address using the verification token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    // Find user with this verification token
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired verification token');
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return {
        success: true,
        message: 'Email already verified',
      };
    }

    // Update user to mark email as verified and clear the token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is already verified
    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = this.generateVerificationToken();

    // Update user with new token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
      },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(email, emailVerificationToken, user.username);

    return {
      success: true,
      message: 'Verification email sent',
    };
  }

  /**
   * Handle Google OAuth login/registration
   */
  async googleOAuth(profile: any): Promise<any> {
    const { oauthId, email, displayName, avatarUrl } = profile;

    // Check if user already exists with this OAuth ID
    let user = await this.prisma.user.findFirst({
      where: {
        oauthProvider: 'google',
        oauthId,
      },
    });

    // If user exists, return login response
    if (user) {
      // Check if user is banned
      if (user.isBanned) {
        throw new UnauthorizedException('Your account has been banned');
      }

      // Generate JWT token
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: '24h',
      });

      // Remove password hash from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken,
        expiresIn: '24h',
        isNewUser: false,
      };
    }

    // Check if user exists with this email (linking accounts)
    user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Link OAuth account to existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          oauthProvider: 'google',
          oauthId,
          avatarUrl: avatarUrl || user.avatarUrl,
          emailVerified: true, // OAuth emails are pre-verified
        },
      });

      // Generate JWT token
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: '24h',
      });

      // Remove password hash from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken,
        expiresIn: '24h',
        isNewUser: false,
        accountLinked: true,
      };
    }

    // New user - return profile data for registration completion
    return {
      isNewUser: true,
      profile: {
        email,
        oauthId,
        displayName,
        avatarUrl,
        oauthProvider: 'google',
      },
    };
  }

  /**
   * Complete Google OAuth registration
   */
  async completeGoogleRegistration(data: {
    email: string;
    oauthId: string;
    displayName: string;
    avatarUrl?: string;
    username: string;
    collegeName: string;
    collegeDomain: string;
  }): Promise<any> {
    const { email, oauthId, displayName, avatarUrl, username, collegeName, collegeDomain } = data;

    // Validate college email domain
    this.validateCollegeDomain(email, collegeDomain);

    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Create user with OAuth data
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        displayName,
        avatarUrl,
        collegeName,
        collegeDomain,
        oauthProvider: 'google',
        oauthId,
        role: 'PLAYER',
        emailVerified: true, // OAuth emails are pre-verified
        passwordHash: null, // No password for OAuth users
      },
    });

    // Create initial ratings for all time controls
    await this.createInitialRatings(user.id);

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '24h',
    });

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      expiresIn: '24h',
      isNewUser: true,
    };
  }

  /**
   * Request password reset - sends email with reset token
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ success: boolean; message: string }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      };
    }

    // Don't allow password reset for OAuth users
    if (user.oauthProvider) {
      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      };
    }

    // Generate password reset token
    const passwordResetToken = this.generatePasswordResetToken();

    // Set expiration to 1 hour from now
    const passwordResetExpires = new Date();
    passwordResetExpires.setHours(passwordResetExpires.getHours() + 1);

    // Update user with reset token and expiration
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, passwordResetToken, user.username);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new BadRequestException('Failed to send password reset email');
    }

    return {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
    };
  }

  /**
   * Reset password using the reset token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Find user with this reset token
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Check if token has expired (1 hour expiration)
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Password reset token has expired');
    }

    // Hash new password with bcrypt using 10 salt rounds
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update user with new password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}

