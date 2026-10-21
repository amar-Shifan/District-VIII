import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { EnvironmentVariables } from '../config/env.validation';
import { AuthService } from './auth.service';
import type { AdminPrincipal, JwtPayload } from './jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly auth: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<AdminPrincipal> {
    // Socket tokens are only valid for the realtime handshake.
    if (payload.role !== 'admin' || payload.typ !== 'access') {
      throw new UnauthorizedException();
    }
    const admin = await this.auth.findById(payload.sub);
    if (!admin) throw new UnauthorizedException();
    return admin;
  }
}
