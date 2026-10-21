import "server-only";

import type { FoodCategoryDto, FoodItemDto, PublicFoodItemDto, UpsertFoodItemInput } from "@district-viii/shared";
import { notFound } from "../http";
import { FoodItemModel, type FoodItemRecord } from "../models";

const MENU_SORT = { sortOrder: 1, name: 1 } as const;

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

/** Customer-facing: prices stay hidden for now. */
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

export async function listPublicFood(category?: string): Promise<PublicFoodItemDto[]> {
  const rows = await FoodItemModel.find({ isAvailable: true, ...(category ? { category } : {}) })
    .sort(MENU_SORT)
    .lean<FoodItemRecord[]>()
    .exec();
  return rows.map(toPublicDto);
}

/** Categories with at least one available item, ordered by their first item's sortOrder. */
export function foodCategories(): Promise<FoodCategoryDto[]> {
  return FoodItemModel.aggregate<FoodCategoryDto>([
    { $match: { isAvailable: true } },
    { $group: { _id: "$category", count: { $sum: 1 }, order: { $min: "$sortOrder" } } },
    { $sort: { order: 1, _id: 1 } },
    { $project: { _id: 0, name: "$_id", count: 1 } },
  ]).exec();
}

export async function listAllFood(): Promise<FoodItemDto[]> {
  const rows = await FoodItemModel.find().sort({ category: 1, ...MENU_SORT }).lean<FoodItemRecord[]>().exec();
  return rows.map(toDto);
}

async function nextSortOrder(): Promise<number> {
  const last = await FoodItemModel.findOne().sort({ sortOrder: -1 }).lean<FoodItemRecord>().exec();
  return (last?.sortOrder ?? 0) + 10;
}

export async function createFood(input: UpsertFoodItemInput): Promise<FoodItemDto> {
  const sortOrder = input.sortOrder ?? (await nextSortOrder());
  const created = await FoodItemModel.create({ ...input, sortOrder });
  return toDto(created.toObject<FoodItemRecord>());
}

export async function updateFood(id: string, input: Partial<UpsertFoodItemInput>): Promise<FoodItemDto> {
  const updated = await FoodItemModel.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true })
    .lean<FoodItemRecord>()
    .exec();
  if (!updated) throw notFound("Food item not found");
  return toDto(updated);
}

export async function toggleFood(id: string): Promise<FoodItemDto> {
  const updated = await FoodItemModel.findByIdAndUpdate(id, [{ $set: { isAvailable: { $not: "$isAvailable" } } }], {
    new: true,
  })
    .lean<FoodItemRecord>()
    .exec();
  if (!updated) throw notFound("Food item not found");
  return toDto(updated);
}

export async function deleteFood(id: string): Promise<void> {
  const removed = await FoodItemModel.findByIdAndDelete(id).exec();
  if (!removed) throw notFound("Food item not found");
}
