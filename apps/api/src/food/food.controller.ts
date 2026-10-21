import type {
  FoodCategoryDto,
  FoodItemDto,
  PublicFoodItemDto,
} from '@district-viii/shared';
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
import { CreateFoodItemDto, FoodQueryDto, UpdateFoodItemDto } from './food.dto';
import { FoodService } from './food.service';

@ApiTags('food')
@Controller()
export class FoodController {
  constructor(private readonly food: FoodService) {}

  /** Available menu items (no prices). */
  @Get('food')
  list(@Query() query: FoodQueryDto): Promise<PublicFoodItemDto[]> {
    return this.food.listPublic(query.category);
  }

  @Get('food/categories')
  categories(): Promise<FoodCategoryDto[]> {
    return this.food.categories();
  }

  @AdminOnly()
  @Get('admin/food')
  listAll(): Promise<FoodItemDto[]> {
    return this.food.listAll();
  }

  @AdminOnly()
  @Post('admin/food')
  create(@Body() body: CreateFoodItemDto): Promise<FoodItemDto> {
    return this.food.create(body);
  }

  @AdminOnly()
  @Patch('admin/food/:id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateFoodItemDto,
  ): Promise<FoodItemDto> {
    return this.food.update(id, body);
  }

  @AdminOnly()
  @Patch('admin/food/:id/toggle')
  toggle(@Param('id', ParseObjectIdPipe) id: string): Promise<FoodItemDto> {
    return this.food.toggleAvailability(id);
  }

  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('admin/food/:id')
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.food.remove(id);
  }
}
