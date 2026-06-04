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

  async sendSkillsUpdatedEmail(
    email: string,
    newSkills: string[],
    totalSkills: number,
    handle: string,
  ): Promise<void> {
    if (!this.resend) return;

    const frontendUrl = (process.env['FRONTEND_URL'] ?? 'https://devmap.app').replace(/\/$/, '');
    const profileUrl = `${frontendUrl}/u/${handle}`;
    const fromEmail = process.env['EMAIL_FROM'] || 'DevMap <onboarding@resend.dev>';
    const s = newSkills.length === 1 ? '' : 's';
    const skillChips = newSkills
      .map(skill => `<span style="display:inline-block;padding:3px 10px;margin:2px;border-radius:20px;background:rgba(63,185,80,0.12);border:1px solid rgba(63,185,80,0.25);color:#3fb950;font-size:0.82rem;font-weight:500">${skill}</span>`)
      .join('');

    try {
      await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `${newSkills.length} new skill${s} added to your DevMap`,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',system-ui,sans-serif;color:#e6edf3">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <tr><td style="padding-bottom:24px">
          <span style="font-size:1rem;font-weight:700;color:#e6edf3">&#9679; DevMap</span>
        </td></tr>
        <tr><td style="padding-bottom:20px">
          <h1 style="margin:0;font-size:1.25rem;font-weight:700;color:#e6edf3;letter-spacing:-0.02em">
            Your map just updated
          </h1>
          <p style="margin:8px 0 0;font-size:0.88rem;color:#8b949e">
            We detected ${newSkills.length} new skill${s} from your latest GitHub activity:
          </p>
        </td></tr>
        <tr><td style="padding:20px;background:#161b22;border:1px solid #30363d;border-radius:8px;padding-bottom:24px">
          <div style="margin-bottom:16px">${skillChips}</div>
          <div style="font-size:0.8rem;color:#6e7681">${totalSkills} total verified skill${totalSkills === 1 ? '' : 's'} on your map</div>
        </td></tr>
        <tr><td style="padding-top:20px;padding-bottom:32px">
          <a href="${profileUrl}" style="display:inline-block;padding:10px 22px;background:#238636;color:#fff;text-decoration:none;border-radius:6px;font-size:0.88rem;font-weight:600">
            View your updated map →
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid #30363d;padding-top:16px">
          <p style="margin:0;font-size:0.75rem;color:#6e7681">
            Your profile: <a href="${profileUrl}" style="color:#58a6ff;text-decoration:none">${profileUrl}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
      });
      this.logger.log(`Skills updated email sent to ${email} (${newSkills.length} new skills)`);
    } catch (err) {
      this.logger.warn(`Failed to send skills updated email: ${err instanceof Error ? err.message : String(err)}`);
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
