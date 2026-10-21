import type {
  AdminDto,
  LoginResponse,
  SocketTokenResponse,
} from '@district-viii/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminOnly, CurrentAdmin } from './admin-only.decorator';
import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';
import type { AdminPrincipal } from './jwt-payload';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() body: LoginDto): Promise<LoginResponse> {
    return this.auth.login(body.email, body.password);
  }

  @AdminOnly()
  @Get('me')
  me(@CurrentAdmin() admin: AdminPrincipal): AdminDto {
    return admin;
  }

  /** Short-lived token for the socket.io handshake, so the access token can stay in an httpOnly cookie. */
  @AdminOnly()
  @Get('socket-token')
  socketToken(
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<SocketTokenResponse> {
    return this.auth.socketToken(admin);
  }
}
