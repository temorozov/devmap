import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.resend = new Resend('re_UZ7oMiJR_KPuwNZ3eQmXxyueLupyWqyuk');
  }

  async sendConfirmationEmail(email: string, token: string) {
    const confirmLink = `http://localhost:4200/confirm-email?token=${token}`;
    
    try {
      const data = await this.resend.emails.send({
        from: 'onboarding@resend.dev',
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
