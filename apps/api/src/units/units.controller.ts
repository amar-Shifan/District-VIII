import type { UnitDto } from '@district-viii/shared';
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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../auth/admin-only.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateUnitDto, UpdateUnitDto, UpdateUnitStatusDto } from './units.dto';
import { UnitsService } from './units.service';

@ApiTags('units')
@Controller()
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  /** Active units with their live status. */
  @Get('units')
  list(): Promise<UnitDto[]> {
    return this.units.listPublic();
  }

  /** All units, including inactive ones. */
  @AdminOnly()
  @Get('admin/units')
  listAll(): Promise<UnitDto[]> {
    return this.units.listAll();
  }

  @AdminOnly()
  @Post('units')
  create(@Body() body: CreateUnitDto): Promise<UnitDto> {
    return this.units.create(body);
  }

  @AdminOnly()
  @Patch('units/:id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateUnitDto,
  ): Promise<UnitDto> {
    return this.units.update(id, body);
  }

  @AdminOnly()
  @Patch('units/:id/status')
  updateStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateUnitStatusDto,
  ): Promise<UnitDto> {
    return this.units.updateStatus(id, body);
  }

  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('units/:id')
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.units.remove(id);
  }
}
