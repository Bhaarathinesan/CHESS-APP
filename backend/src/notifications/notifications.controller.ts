import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /api/notifications
   * Get user's notifications with pagination
   * Requirements: 18.1
   */
  @Get()
  async findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.findAll(req.user.userId, page, limit);
  }

  /**
   * GET /api/notifications/unread-count
   * Get count of unread notifications
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.userId);
    return { count };
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark notification as read
   * Requirements: 18.1
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const notification = await this.notificationsService.markAsRead(id, req.user.userId);
    return { notification };
  }

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read
   * Requirements: 18.1
   */
  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.userId);
    return { success: true };
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   * Requirements: 18.1
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.notificationsService.delete(id, req.user.userId);
    return { success: true };
  }

  /**
   * GET /api/notifications/push-config
   * Get VAPID public key for push notifications
   * Requirements: 18.13
   */
  @Get('push-config')
  getPushConfig() {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    return { vapidPublicKey };
  }

  /**
   * POST /api/notifications/push-subscribe
   * Subscribe to push notifications
   * Requirements: 18.13
   */
  @Post('push-subscribe')
  async subscribeToPush(@Request() req, @Body() body: { subscription: any }) {
    await this.pushNotificationService.subscribe(req.user.userId, body.subscription);
    return { success: true };
  }

  /**
   * POST /api/notifications/push-unsubscribe
   * Unsubscribe from push notifications
   * Requirements: 18.13
   */
  @Post('push-unsubscribe')
  async unsubscribeFromPush(@Request() req, @Body() body: { endpoint: string }) {
    await this.pushNotificationService.unsubscribe(req.user.userId, body.endpoint);
    return { success: true };
  }

  /**
   * POST /api/notifications/test-push
   * Send a test push notification
   * Requirements: 21.13
   */
  @Post('test-push')
  async testPush(@Request() req) {
    await this.pushNotificationService.sendPushNotification(
      req.user.userId,
      'Test Notification',
      'This is a test push notification from ChessArena!',
      {
        type: 'default',
        linkUrl: '/dashboard',
      },
    );
    return { success: true };
  }
}
