import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards';
import type { AdminPrincipal } from './jwt-payload';

/** Requires a valid admin access token. */
export function AdminOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid admin token' }),
  );
}

/** The authenticated admin, or undefined on endpoints guarded by OptionalJwtAuthGuard. */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminPrincipal | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AdminPrincipal }>();
    return request.user;
  },
);
