import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);
  private readonly resend?: Resend;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env['RESEND_API_KEY'];
    this.fromEmail = process.env['EMAIL_FROM'] || 'DevMap <onboarding@resend.dev>';
    this.frontendUrl = (process.env['FRONTEND_URL'] ?? 'https://devmap.app').replace(/\/$/, '');

    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  // Every Monday at 9:00 AM UTC
  @Cron('0 9 * * 1')
  async sendWeeklyDigests() {
    if (!this.resend) {
      this.logger.debug('RESEND_API_KEY not set — skipping weekly digest');
      return;
    }

    this.logger.log('Starting weekly digest run');

    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400_000);

    // Only send to real users with an email who have some activity
    const users = await this.prisma.user.findMany({
      where: {
        email: { not: null },
        isGuest: false,
        githubUsername: { not: null },
        profileViews: { some: { createdAt: { gte: weekAgo } } },
      },
      select: {
        id: true,
        email: true,
        name: true,
        handle: true,
        githubUsername: true,
        trees: {
          where: { title: 'My Dev Map' },
          take: 1,
          select: { nodes: { select: { verified: true } } },
        },
      },
    });

    this.logger.log(`Sending digest to ${users.length} users`);
    let sent = 0;

    for (const user of users) {
      if (!user.email) continue;

      const [viewsThisWeek, viewsLastWeek] = await Promise.all([
        this.prisma.profileView.count({ where: { userId: user.id, createdAt: { gte: weekAgo } } }),
        this.prisma.profileView.count({ where: { userId: user.id, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      ]);

      const devMap = user.trees[0];
      const verifiedSkills = devMap?.nodes.filter(n => n.verified).length ?? 0;
      const handle = user.handle ?? user.githubUsername ?? '';
      const profileUrl = `${this.frontendUrl}/u/${handle}`;

      const trend = viewsThisWeek > viewsLastWeek ? '↑' : viewsThisWeek < viewsLastWeek ? '↓' : '→';
      const trendText = viewsLastWeek > 0
        ? `${trend} ${Math.abs(viewsThisWeek - viewsLastWeek)} vs last week`
        : 'First week tracked';

      // Find new skills added this week by comparing last two scans
      const recentScans = await this.prisma.gitHubScan.findMany({
        where: { userId: user.id },
        orderBy: { scannedAt: 'desc' },
        take: 2,
        select: { summary: true, scannedAt: true },
      });
      const newSkillsThisWeek: string[] = [];
      if (recentScans.length === 2) {
        const latestTitles = new Set(
          (recentScans[0].summary as Array<{ title: string }> ?? []).map(s => s.title),
        );
        const previousTitles = new Set(
          (recentScans[1].summary as Array<{ title: string }> ?? []).map(s => s.title),
        );
        for (const title of latestTitles) {
          if (!previousTitles.has(title)) newSkillsThisWeek.push(title);
        }
      }

      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to: user.email,
          subject: `Your DevMap: ${viewsThisWeek} profile view${viewsThisWeek === 1 ? '' : 's'} this week`,
          html: this.buildDigestHtml({
            name: user.name ?? handle,
            handle,
            profileUrl,
            viewsThisWeek,
            trendText,
            verifiedSkills,
            newSkills: newSkillsThisWeek,
          }),
        });
        sent++;
      } catch (err) {
        this.logger.warn(`Failed to send digest to ${user.email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.logger.log(`Weekly digest complete — sent ${sent}/${users.length}`);
  }

  private buildDigestHtml(data: {
    name: string;
    handle: string;
    profileUrl: string;
    viewsThisWeek: number;
    trendText: string;
    verifiedSkills: number;
    newSkills: string[];
  }): string {
    const newSkillsBlock = data.newSkills.length > 0 ? `
        <!-- New skills -->
        <tr><td style="padding-bottom:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px 24px">
            <tr><td>
              <div style="font-size:0.78rem;font-weight:600;color:#3fb950;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">
                ✦ ${data.newSkills.length} new skill${data.newSkills.length === 1 ? '' : 's'} detected
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${data.newSkills.slice(0, 8).map(s =>
                  `<span style="display:inline-block;padding:3px 10px;background:rgba(63,185,80,0.12);border:1px solid rgba(63,185,80,0.3);border-radius:20px;font-size:0.8rem;color:#3fb950">${s}</span>`
                ).join('\n                ')}
                ${data.newSkills.length > 8 ? `<span style="font-size:0.8rem;color:#6e7681;padding:3px 0">+${data.newSkills.length - 8} more</span>` : ''}
              </div>
            </td></tr>
          </table>
        </td></tr>` : '';

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',system-ui,sans-serif;color:#e6edf3">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr><td style="padding-bottom:28px">
          <span style="font-size:1rem;font-weight:700;color:#e6edf3;letter-spacing:-0.02em">
            &#9679; DevMap
          </span>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding-bottom:24px">
          <h1 style="margin:0;font-size:1.35rem;font-weight:700;color:#e6edf3;letter-spacing:-0.02em">
            Hey ${data.name} — here's your week
          </h1>
        </td></tr>

        <!-- View count card -->
        <tr><td style="padding-bottom:16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:24px">
            <tr>
              <td>
                <div style="font-size:2.5rem;font-weight:700;color:#3fb950;font-family:monospace;line-height:1">${data.viewsThisWeek}</div>
                <div style="font-size:0.85rem;color:#8b949e;margin-top:4px">profile views this week</div>
                <div style="font-size:0.8rem;color:#6e7681;margin-top:2px">${data.trendText}</div>
              </td>
              <td align="right" style="vertical-align:top">
                <div style="font-size:1.6rem;font-weight:700;color:#58a6ff;font-family:monospace;line-height:1">${data.verifiedSkills}</div>
                <div style="font-size:0.85rem;color:#8b949e;margin-top:4px">skills in your stack</div>
              </td>
            </tr>
          </table>
        </td></tr>

        ${newSkillsBlock}

        <!-- CTA -->
        <tr><td style="padding-bottom:32px">
          <a href="${data.profileUrl}"
             style="display:inline-block;padding:10px 22px;background:#238636;color:#fff;text-decoration:none;border-radius:6px;font-size:0.88rem;font-weight:600">
            View your profile →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid #30363d;padding-top:20px">
          <p style="margin:0;font-size:0.78rem;color:#6e7681">
            Your public profile: <a href="${data.profileUrl}" style="color:#58a6ff;text-decoration:none">${data.profileUrl}</a>
          </p>
          <p style="margin:8px 0 0;font-size:0.75rem;color:#6e7681">
            You're receiving this because you have a DevMap account.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
