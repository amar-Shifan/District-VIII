import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { AdminPrincipal } from './jwt-payload';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Lets anonymous requests through with `request.user` unset, but rejects a
 * bearer token that is present and invalid. Used by endpoints that both
 * customers and admins call (e.g. cancelling a booking).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.headers.authorization) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = AdminPrincipal>(
    error: unknown,
    user: TUser | false,
  ): TUser {
    if (error || !user)
      throw new UnauthorizedException('Invalid or expired token');
    return user;
  }
}
