import { hasEnvValues } from '../config/env';

export function isGitHubOAuthEnabled(): boolean {
  return hasEnvValues(
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL',
  );
}
