import { Request } from 'express';
import { User } from '@prisma/client';

/** The user record Passport attaches to the request after JWT validation. */
export type AuthenticatedUser = User;

/** Express request enriched with the authenticated user. */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
