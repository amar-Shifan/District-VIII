import type { PublicSettingsDto, SettingsDto } from '@district-viii/shared';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../auth/admin-only.decorator';
import { UpdateSettingsDto } from './settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Arena name, operating hours and booking window. */
  @Get('settings/public')
  getPublic(): Promise<PublicSettingsDto> {
    return this.settings.getPublic();
  }

  @AdminOnly()
  @Get('admin/settings')
  get(): Promise<SettingsDto> {
    return this.settings.get();
  }

  @AdminOnly()
  @Put('admin/settings')
  update(@Body() body: UpdateSettingsDto): Promise<SettingsDto> {
    return this.settings.update(body);
  }
}
