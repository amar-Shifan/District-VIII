import { requireAdmin } from "@/server/auth";
import { json, route } from "@/server/http";

export const GET = route(async (request) => json(await requireAdmin(request)));
