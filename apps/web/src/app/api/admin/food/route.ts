import { requireAdmin } from "@/server/auth";
import { json, parseBody, route } from "@/server/http";
import { createFood, listAllFood } from "@/server/services/food";
import { createFoodSchema } from "@/server/validation";

export const GET = route(async (request) => {
  await requireAdmin(request);
  return json(await listAllFood());
});

export const POST = route(async (request) => {
  await requireAdmin(request);
  return json(await createFood(await parseBody(request, createFoodSchema)), 201);
});
