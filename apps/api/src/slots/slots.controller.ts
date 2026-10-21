import type { BlockedSlotDto } from '@district-viii/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../auth/admin-only.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import {
  CreateBlockedSlotDto,
  ListBlockedSlotsQueryDto,
  UpdateBlockedSlotDto,
} from './slots.dto';
import { SlotsService } from './slots.service';

/** Hours an admin has blocked. The availability grid shows them as unavailable. */
@ApiTags('admin: blocked slots')
@AdminOnly()
@Controller('admin/slots')
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get()
  list(@Query() query: ListBlockedSlotsQueryDto): Promise<BlockedSlotDto[]> {
    return this.slots.list(query);
  }

  @Post()
  create(@Body() body: CreateBlockedSlotDto): Promise<BlockedSlotDto> {
    return this.slots.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateBlockedSlotDto,
  ): Promise<BlockedSlotDto> {
    return this.slots.update(id, body);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.slots.remove(id);
  }
}
