import { hasEnvValues } from '../config/env';

export function isGoogleOAuthEnabled(): boolean {
  return hasEnvValues(
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
  );
}

export function isDiscordOAuthEnabled(): boolean {
  return hasEnvValues(
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_CALLBACK_URL',
  );
}

export function isGitHubOAuthEnabled(): boolean {
  return hasEnvValues(
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL',
  );
}
