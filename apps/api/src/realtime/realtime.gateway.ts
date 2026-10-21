import { ADMIN_ROOM } from '@district-viii/shared';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/jwt-payload';
import { RealtimeService } from './realtime.service';

/**
 * Anyone may connect and receive public availability events. Sockets that
 * present a valid admin token in `handshake.auth.token` also join the admin
 * room. CORS is configured in SocketIoAdapter from CORS_ORIGINS.
 */
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwt: JwtService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.attach(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const auth = client.handshake.auth as { token?: unknown } | undefined;
    const token = typeof auth?.token === 'string' ? auth.token : null;
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (payload.role === 'admin') {
        await client.join(ADMIN_ROOM);
      }
    } catch {
      this.logger.warn('Socket connected with an invalid admin token');
      client.emit('auth:error', { message: 'Invalid or expired token' });
    }
  }
}
