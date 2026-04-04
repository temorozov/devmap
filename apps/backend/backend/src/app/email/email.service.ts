import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { getEnv } from '../config/env';

@Injectable()
export class EmailService {
  private resend?: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    const apiKey = process.env['RESEND_API_KEY'];

    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendConfirmationEmail(email: string, token: string) {
    const confirmLink = `${getEnv('EMAIL_CONFIRM_URL')}?token=${token}`;

    if (!this.resend) {
      throw new Error('RESEND_API_KEY is required to send confirmation emails');
    }
    
    try {
      const data = await this.resend.emails.send({
        from: getEnv('EMAIL_FROM'),
        to: email,
        subject: 'Confirm your email address - Skill Tree',
        html: `
          <h1>Welcome to Skill Tree!</h1>
          <p>Please confirm your email address by clicking the link below:</p>
          <a href="${confirmLink}">Confirm Email</a>
          <p>Or copy and paste this link into your browser: ${confirmLink}</p>
        `,
      });
      this.logger.log(`Confirmation email sent to ${email}`, data);
      return data;
    } catch (error) {
      this.logger.error(`Error sending confirmation email to ${email}`, error);
      throw error;
    }
  }
}
