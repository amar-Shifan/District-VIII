import type { AdminDto } from '@district-viii/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin';
  /** "access" for API calls, "socket" for the short-lived realtime handshake token. */
  typ: 'access' | 'socket';
}

/** What `request.user` holds after the JWT guard. */
export type AdminPrincipal = AdminDto;
