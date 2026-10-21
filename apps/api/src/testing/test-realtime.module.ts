import { Global, Module } from '@nestjs/common';
import { RealtimeService } from '../realtime/realtime.service';

/** RealtimeService without a socket server: every emit is a no-op. */
@Global()
@Module({
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class TestRealtimeModule {}
