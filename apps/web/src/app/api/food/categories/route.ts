import { json, route } from "@/server/http";
import { foodCategories } from "@/server/services/food";

export const GET = route(async () => json(await foodCategories()));
