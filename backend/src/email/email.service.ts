import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.fromEmail = this.configService.get<string>('FROM_EMAIL') || 'noreply@chessarena.com';
    
    if (apiKey && apiKey !== 'your-sendgrid-api-key') {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      this.logger.log('SendGrid email service configured');
    } else {
      this.isConfigured = false;
      this.logger.warn('SendGrid API key not configured - emails will be logged only');
    }
  }

  async sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: 'Verify your ChessArena account',
      text: `Hello ${username},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.\n\nBest regards,\nChessArena Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ChessArena!</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours. If you did not create an account, please ignore this email.
          </p>
        </div>
      `,
    };

    if (this.isConfigured) {
      try {
        await sgMail.send(msg);
        this.logger.log(`Verification email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send verification email to ${email}:`, error);
        throw new Error('Failed to send verification email');
      }
    } else {
      // In development without SendGrid configured, just log the email
      this.logger.log(`[DEV MODE] Verification email would be sent to ${email}`);
      this.logger.log(`[DEV MODE] Verification URL: ${verificationUrl}`);
    }
  }

  async sendPasswordResetEmail(email: string, token: string, username: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: 'Reset your ChessArena password',
      text: `Hello ${username},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nChessArena Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour. If you did not request a password reset, please ignore this email.
          </p>
        </div>
      `,
    };

    if (this.isConfigured) {
      try {
        await sgMail.send(msg);
        this.logger.log(`Password reset email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send password reset email to ${email}:`, error);
        throw new Error('Failed to send password reset email');
      }
    } else {
      // In development without SendGrid configured, just log the email
      this.logger.log(`[DEV MODE] Password reset email would be sent to ${email}`);
      this.logger.log(`[DEV MODE] Reset URL: ${resetUrl}`);
    }
  }

  /**
   * Send tournament confirmation email
   * Requirements: 18.17
   */
  async sendTournamentConfirmationEmail(
    email: string,
    username: string,
    tournamentName: string,
    tournamentId: string,
    startTime: Date,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const tournamentUrl = `${frontendUrl}/tournaments/${tournamentId}`;
    const startTimeFormatted = startTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: `Tournament Registration Confirmed: ${tournamentName}`,
      text: `Hello ${username},\n\nYou have successfully registered for ${tournamentName}.\n\nStart Time: ${startTimeFormatted}\n\nView tournament details: ${tournamentUrl}\n\nGood luck!\n\nBest regards,\nChessArena Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Tournament Registration Confirmed</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>You have successfully registered for <strong>${tournamentName}</strong>.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Tournament:</strong> ${tournamentName}</p>
            <p style="margin: 5px 0;"><strong>Start Time:</strong> ${startTimeFormatted}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${tournamentUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Tournament
            </a>
          </div>
          <p>Good luck!</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            You will receive a reminder 5 minutes before the tournament starts.
          </p>
        </div>
      `,
    };

    if (this.isConfigured) {
      try {
        await sgMail.send(msg);
        this.logger.log(`Tournament confirmation email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send tournament confirmation email to ${email}:`, error);
      }
    } else {
      this.logger.log(`[DEV MODE] Tournament confirmation email would be sent to ${email}`);
    }
  }

  /**
   * Send tournament reminder email (5 minutes before)
   * Requirements: 18.17
   */
  async sendTournamentReminderEmail(
    email: string,
    username: string,
    tournamentName: string,
    tournamentId: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const tournamentUrl = `${frontendUrl}/tournaments/${tournamentId}`;

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: `Tournament Starting Soon: ${tournamentName}`,
      text: `Hello ${username},\n\n${tournamentName} starts in 5 minutes!\n\nJoin now: ${tournamentUrl}\n\nBest regards,\nChessArena Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF9800;">Tournament Starting Soon!</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p><strong>${tournamentName}</strong> starts in <strong>5 minutes</strong>!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${tournamentUrl}" 
               style="background-color: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Join Tournament Now
            </a>
          </div>
          <p>Make sure you're ready to play!</p>
        </div>
      `,
    };

    if (this.isConfigured) {
      try {
        await sgMail.send(msg);
        this.logger.log(`Tournament reminder email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send tournament reminder email to ${email}:`, error);
      }
    } else {
      this.logger.log(`[DEV MODE] Tournament reminder email would be sent to ${email}`);
    }
  }

  /**
   * Send weekly summary email
   * Requirements: 18.18
   */
  async sendWeeklySummaryEmail(
    email: string,
    username: string,
    stats: {
      gamesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
      ratingChange: number;
      bestWin?: string;
      achievements: number;
    },
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const profileUrl = `${frontendUrl}/profile/me`;
    const winRate = stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) : '0';
    const ratingChangeText = stats.ratingChange >= 0 ? `+${stats.ratingChange}` : `${stats.ratingChange}`;

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: 'Your Weekly Chess Summary',
      text: `Hello ${username},\n\nHere's your chess activity for the past week:\n\nGames Played: ${stats.gamesPlayed}\nWins: ${stats.wins}\nLosses: ${stats.losses}\nDraws: ${stats.draws}\nWin Rate: ${winRate}%\nRating Change: ${ratingChangeText}\nAchievements Unlocked: ${stats.achievements}\n\nView your profile: ${profileUrl}\n\nKeep playing!\n\nBest regards,\nChessArena Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your Weekly Chess Summary</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p>Here's your chess activity for the past week:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Games Played:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${stats.gamesPlayed}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Wins:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #4CAF50;">${stats.wins}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Losses:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #f44336;">${stats.losses}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Draws:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #FF9800;">${stats.draws}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Win Rate:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${winRate}%</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Rating Change:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: ${stats.ratingChange >= 0 ? '#4CAF50' : '#f44336'};">${ratingChangeText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Achievements Unlocked:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${stats.achievements}</td>
              </tr>
            </table>
          </div>
          ${stats.bestWin ? `<p><strong>Best Win:</strong> ${stats.bestWin}</p>` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${profileUrl}" 
               style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Your Profile
            </a>
          </div>
          <p>Keep playing and improving!</p>
        </div>
      `,
    };

    if (this.isConfigured) {
      try {
        await sgMail.send(msg);
        this.logger.log(`Weekly summary email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send weekly summary email to ${email}:`, error);
      }
    } else {
      this.logger.log(`[DEV MODE] Weekly summary email would be sent to ${email}`);
    }
  }

  /**
   * Send security event email
   * Requirements: 18.19
   */
  async sendSecurityEventEmail(
    email: string,
    username: string,
    eventType: string,
    eventDetails: {
      ipAddress?: string;
      location?: string;
      device?: string;
      timestamp: Date;
    },
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const settingsUrl = `${frontendUrl}/profile/settings`;
    const timestampFormatted = eventDetails.timestamp.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const eventMessages = {
      password_changed: 'Your password was changed',
      new_login: 'New login to your account',
      email_changed: 'Your email address was changed',
      two_factor_enabled: 'Two-factor authentication was enabled',
      two_factor_disabled: 'Two-factor authentication was disabled',
    };

    const eventMessage = eventMessages[eventType] || 'Security event on your account';

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: `Security Alert: ${eventMessage}`,
      text: `Hello ${username},\n\n${eventMessage}.\n\nTime: ${timestampFormatted}\n${eventDetails.ipAddress ? `IP Address: ${eventDetails.ipAddress}\n` : ''}${eventDetails.location ? `Location: ${eventDetails.location}\n` : ''}${eventDetails.device ? `Device: ${eventDetails.device}\n` : ''}\nIf this wasn't you, please secure your account immediately: ${settingsUrl}\n\nBest regards,\nChessArena Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">Security Alert</h2>
          <p>Hello <strong>${username}</strong>,</p>
          <p><strong>${eventMessage}</strong></p>
          <div style="background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timestampFormatted}</p>
            ${eventDetails.ipAddress ? `<p style="margin: 5px 0;"><strong>IP Address:</strong> ${eventDetails.ipAddress}</p>` : ''}
            ${eventDetails.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${eventDetails.location}</p>` : ''}
            ${eventDetails.device ? `<p style="margin: 5px 0;"><strong>Device:</strong> ${eventDetails.device}</p>` : ''}
          </div>
          <p>If this wasn't you, please secure your account immediately.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${settingsUrl}" 
               style="background-color: #f44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Secure Your Account
            </a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This is an automated security notification. If you recognize this activity, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    if (this.isConfigured) {
      try {
        await sgMail.send(msg);
        this.logger.log(`Security event email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send security event email to ${email}:`, error);
      }
    } else {
      this.logger.log(`[DEV MODE] Security event email would be sent to ${email}`);
    }
  }
}
