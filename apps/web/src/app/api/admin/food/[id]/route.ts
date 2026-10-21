import { requireAdmin } from "@/server/auth";
import { json, noContent, objectId, parseBody, route } from "@/server/http";
import { deleteFood, updateFood } from "@/server/services/food";
import { updateFoodSchema } from "@/server/validation";

export const PATCH = route<RouteContext<"/api/admin/food/[id]">>(async (request, context) => {
  await requireAdmin(request);
  const id = objectId((await context.params).id);
  return json(await updateFood(id, await parseBody(request, updateFoodSchema)));
});

export const DELETE = route<RouteContext<"/api/admin/food/[id]">>(async (request, context) => {
  await requireAdmin(request);
  await deleteFood(objectId((await context.params).id));
  return noContent();
});
