import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, RegisterDtoSchema } from './dto/register.dto';
import { LoginDto, LoginDtoSchema } from './dto/login.dto';
import { ForgotPasswordDto, ForgotPasswordDtoSchema } from './dto/forgot-password.dto';
import { ResetPasswordDto, ResetPasswordDtoSchema } from './dto/reset-password.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(RegisterDtoSchema))
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);

    return {
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      user,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginDtoSchema))
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);

    return {
      success: true,
      message: 'Login successful',
      ...result,
    };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: any) {
    return {
      success: true,
      user,
    };
  }

  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    const result = await this.authService.verifyEmail(token);

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    const result = await this.authService.resendVerificationEmail(email);

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {
    // Initiates Google OAuth flow
    // The guard redirects to Google's OAuth consent screen
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      // The user profile is attached to req.user by the GoogleStrategy
      const result = await this.authService.googleOAuth(req.user);

      if (result.isNewUser) {
        // New user needs to complete registration with college info
        // Redirect to frontend registration completion page with profile data
        const profileData = encodeURIComponent(JSON.stringify(result.profile));
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/complete-registration?profile=${profileData}`,
        );
      }

      // Existing user - redirect to frontend with token
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?token=${result.accessToken}&isNewUser=false`,
      );
    } catch (error) {
      // Redirect to frontend with error
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${error.message}`);
    }
  }

  @Public()
  @Post('google/complete-registration')
  @HttpCode(HttpStatus.CREATED)
  async completeGoogleRegistration(@Body() data: any) {
    const result = await this.authService.completeGoogleRegistration(data);

    return {
      success: true,
      message: 'Registration completed successfully',
      ...result,
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ForgotPasswordDtoSchema))
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(forgotPasswordDto);

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ResetPasswordDtoSchema))
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(resetPasswordDto);

    return {
      success: result.success,
      message: result.message,
    };
  }
}
