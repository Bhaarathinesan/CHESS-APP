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
}
