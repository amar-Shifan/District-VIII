import type {
  FoodCategoryDto,
  FoodItemDto,
  PublicFoodItemDto,
} from '@district-viii/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FoodItem, type FoodItemRecord } from './food-item.schema';
import { CreateFoodItemDto, UpdateFoodItemDto } from './food.dto';

const MENU_SORT = { sortOrder: 1, name: 1 } as const;

@Injectable()
export class FoodService {
  constructor(
    @InjectModel(FoodItem.name) private readonly items: Model<FoodItem>,
  ) {}

  async listPublic(category?: string): Promise<PublicFoodItemDto[]> {
    const rows = await this.items
      .find({ isAvailable: true, ...(category ? { category } : {}) })
      .sort(MENU_SORT)
      .lean<FoodItemRecord[]>()
      .exec();
    return rows.map(toPublicDto);
  }

  /** Categories with at least one available item, ordered by their first item's sortOrder. */
  async categories(): Promise<FoodCategoryDto[]> {
    return this.items
      .aggregate<FoodCategoryDto>([
        { $match: { isAvailable: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            order: { $min: '$sortOrder' },
          },
        },
        { $sort: { order: 1, _id: 1 } },
        { $project: { _id: 0, name: '$_id', count: 1 } },
      ])
      .exec();
  }

  async listAll(): Promise<FoodItemDto[]> {
    const rows = await this.items
      .find()
      .sort({ category: 1, ...MENU_SORT })
      .lean<FoodItemRecord[]>()
      .exec();
    return rows.map(toDto);
  }

  async create(input: CreateFoodItemDto): Promise<FoodItemDto> {
    const sortOrder = input.sortOrder ?? (await this.nextSortOrder());
    const created = await this.items.create({ ...input, sortOrder });
    return toDto(created.toObject<FoodItemRecord>());
  }

  async update(id: string, input: UpdateFoodItemDto): Promise<FoodItemDto> {
    const updated = await this.items
      .findByIdAndUpdate(
        id,
        { $set: input },
        { new: true, runValidators: true },
      )
      .lean<FoodItemRecord>()
      .exec();
    if (!updated) throw new NotFoundException('Food item not found');
    return toDto(updated);
  }

  async toggleAvailability(id: string): Promise<FoodItemDto> {
    const updated = await this.items
      .findByIdAndUpdate(
        id,
        [{ $set: { isAvailable: { $not: '$isAvailable' } } }],
        { new: true },
      )
      .lean<FoodItemRecord>()
      .exec();
    if (!updated) throw new NotFoundException('Food item not found');
    return toDto(updated);
  }

  async remove(id: string): Promise<void> {
    const removed = await this.items.findByIdAndDelete(id).exec();
    if (!removed) throw new NotFoundException('Food item not found');
  }

  private async nextSortOrder(): Promise<number> {
    const last = await this.items
      .findOne()
      .sort({ sortOrder: -1 })
      .lean<FoodItemRecord>()
      .exec();
    return (last?.sortOrder ?? 0) + 10;
  }
}

function toDto(row: FoodItemRecord): FoodItemDto {
  return {
    id: String(row._id),
    name: row.name,
    category: row.category,
    description: row.description,
    imageUrl: row.imageUrl,
    price: row.price ?? null,
    isAvailable: row.isAvailable,
    sortOrder: row.sortOrder,
  };
}

function toPublicDto(row: FoodItemRecord): PublicFoodItemDto {
  return {
    id: String(row._id),
    name: row.name,
    category: row.category,
    description: row.description,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
  };
}
