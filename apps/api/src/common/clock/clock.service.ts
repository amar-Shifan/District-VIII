import { Injectable } from '@nestjs/common';

/** Single source of "now", so tests can pin time. */
@Injectable()
export class ClockService {
  now(): Date {
    return new Date();
  }
}
