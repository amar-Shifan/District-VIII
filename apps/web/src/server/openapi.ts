import "server-only";

/**
 * OpenAPI 3 description of every /api route, served at /api/docs and rendered
 * with Swagger UI at /docs. Keep it next to the route handlers when adding endpoints.
 */

type Schema = Record<string, unknown>;

const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (name: string): Schema => ({ type: "array", items: ref(name) });
const ok = (schema: Schema, status = "200") => ({
  [status]: { description: "OK", content: { "application/json": { schema } } },
});
const errors = (...codes: number[]) =>
  Object.fromEntries(
    codes.map((code) => [String(code), { description: "Error", content: { "application/json": { schema: ref("ApiError") } } }]),
  );
const body = (schema: Schema) => ({ required: true, content: { "application/json": { schema } } });
const idParam = (name = "id") => ({ name, in: "path", required: true, schema: { type: "string" } });
const query = (name: string, schema: Schema, required = false, description?: string) => ({
  name,
  in: "query",
  required,
  schema,
  ...(description ? { description } : {}),
});

const admin = [{ adminCookie: [] }, { bearer: [] }];
const isoDate = { type: "string", format: "date", example: "2026-10-22" };
const unitType = { type: "string", enum: ["pool", "ps5"] };
const bookingStatus = { type: "string", enum: ["pending", "approved", "rejected", "cancelled"] };

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "District VIII API",
    version: "2.0.0",
    description:
      "Bookings for 8-ball pool tables and PS5 stations, the food menu and the admin panel. Runs as Next.js route handlers. " +
      "Times are Asia/Kolkata; a business date covers 12 PM to 4 AM the next morning by default. " +
      "Admin routes accept the httpOnly session cookie (mutations also need the `x-admin-request: 1` header) or a Bearer token.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "units" },
    { name: "availability" },
    { name: "bookings" },
    { name: "food" },
    { name: "settings" },
    { name: "live" },
    { name: "auth" },
    { name: "admin" },
  ],
  paths: {
    "/api/units": {
      get: { tags: ["units"], summary: "Active units with live status", responses: ok(arrayOf("Unit")) },
      post: {
        tags: ["admin"],
        summary: "Create a unit",
        security: admin,
        requestBody: body(ref("CreateUnit")),
        responses: { ...ok(ref("Unit"), "201"), ...errors(400, 401, 409) },
      },
    },
    "/api/units/summary": {
      get: { tags: ["units"], summary: "Free units per type right now", responses: ok(ref("UnitsSummary")) },
    },
    "/api/units/{id}": {
      patch: {
        tags: ["admin"],
        summary: "Rename or (de)activate a unit",
        security: admin,
        parameters: [idParam()],
        requestBody: body({ type: "object", properties: { name: { type: "string" }, isActive: { type: "boolean" } } }),
        responses: { ...ok(ref("Unit")), ...errors(400, 401, 404, 409) },
      },
      delete: {
        tags: ["admin"],
        summary: "Delete a unit without upcoming bookings",
        security: admin,
        parameters: [idParam()],
        responses: { "204": { description: "Deleted" }, ...errors(401, 404, 409) },
      },
    },
    "/api/units/{id}/status": {
      patch: {
        tags: ["admin"],
        summary: "Set free, busy (with busyUntil) or maintenance",
        security: admin,
        parameters: [idParam()],
        requestBody: body({
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["free", "busy", "maintenance"] },
            busyUntil: { type: "string", format: "date-time" },
          },
        }),
        responses: { ...ok(ref("Unit")), ...errors(400, 401, 404) },
      },
    },
    "/api/admin/units": {
      get: { tags: ["admin"], summary: "All units including inactive", security: admin, responses: ok(arrayOf("Unit")) },
    },
    "/api/availability": {
      get: {
        tags: ["availability"],
        summary: "Hourly slot grid for a unit type and business date",
        parameters: [query("type", unitType, true), query("date", isoDate, true)],
        responses: { ...ok(ref("Availability")), ...errors(400) },
      },
    },
    "/api/bookings": {
      get: {
        tags: ["admin"],
        summary: "List bookings",
        security: admin,
        parameters: [
          query("status", bookingStatus),
          query("type", unitType),
          query("from", isoDate),
          query("to", isoDate),
          query("search", { type: "string" }, false, "Customer name or phone"),
          query("page", { type: "integer", minimum: 1 }),
          query("pageSize", { type: "integer", minimum: 1, maximum: 100 }),
          query("sort", { type: "string", enum: ["createdAt", "businessDate", "startHour", "customerName", "status"] }),
          query("order", { type: "string", enum: ["asc", "desc"] }),
        ],
        responses: { ...ok(ref("BookingPage")), ...errors(400, 401) },
      },
      post: {
        tags: ["bookings"],
        summary: "Request a booking (held as pending). 10/min per IP",
        requestBody: body(ref("CreateBooking")),
        responses: { ...ok(ref("Booking"), "201"), ...errors(400, 404, 409, 429) },
      },
    },
    "/api/bookings/admin": {
      post: {
        tags: ["admin"],
        summary: "Walk-in booking (approved immediately)",
        security: admin,
        requestBody: body(ref("CreateBooking")),
        responses: { ...ok(ref("Booking"), "201"), ...errors(400, 401, 409) },
      },
    },
    "/api/bookings/by-phone/{phone}": {
      get: {
        tags: ["bookings"],
        summary: "A customer's bookings from the last 14 days and upcoming. 20/min per IP",
        parameters: [idParam("phone")],
        responses: { ...ok(arrayOf("Booking")), ...errors(400, 429) },
      },
    },
    "/api/bookings/{id}/approve": {
      patch: {
        tags: ["admin"],
        summary: "Approve a pending booking",
        security: admin,
        parameters: [idParam()],
        responses: { ...ok(ref("Booking")), ...errors(401, 404, 409) },
      },
    },
    "/api/bookings/{id}/reject": {
      patch: {
        tags: ["admin"],
        summary: "Reject a pending booking with an optional reason",
        security: admin,
        parameters: [idParam()],
        requestBody: body({ type: "object", properties: { reason: { type: "string", maxLength: 200 } } }),
        responses: { ...ok(ref("Booking")), ...errors(401, 404, 409) },
      },
    },
    "/api/bookings/{id}/cancel": {
      patch: {
        tags: ["bookings"],
        summary: "Customer cancels a pending booking with the matching phone; admins may cancel pending or approved",
        parameters: [idParam()],
        requestBody: body({ type: "object", properties: { phone: { type: "string" } } }),
        responses: { ...ok(ref("Booking")), ...errors(400, 401, 403, 404, 409, 429) },
      },
    },
    "/api/admin/slots": {
      get: {
        tags: ["admin"],
        summary: "Blocked hours",
        security: admin,
        parameters: [query("date", isoDate), query("unitId", { type: "string" })],
        responses: ok(arrayOf("BlockedSlot")),
      },
      post: {
        tags: ["admin"],
        summary: "Block an hour",
        security: admin,
        requestBody: body({
          type: "object",
          required: ["unitId", "businessDate", "startHour", "reason"],
          properties: {
            unitId: { type: "string" },
            businessDate: isoDate,
            startHour: { type: "integer", minimum: 0, maximum: 23 },
            reason: { type: "string" },
          },
        }),
        responses: { ...ok(ref("BlockedSlot"), "201"), ...errors(400, 401, 409) },
      },
    },
    "/api/admin/slots/{id}": {
      patch: {
        tags: ["admin"],
        summary: "Change a block's reason",
        security: admin,
        parameters: [idParam()],
        requestBody: body({ type: "object", required: ["reason"], properties: { reason: { type: "string" } } }),
        responses: { ...ok(ref("BlockedSlot")), ...errors(401, 404) },
      },
      delete: {
        tags: ["admin"],
        summary: "Unblock an hour",
        security: admin,
        parameters: [idParam()],
        responses: { "204": { description: "Unblocked" }, ...errors(401, 404) },
      },
    },
    "/api/food": {
      get: {
        tags: ["food"],
        summary: "Available menu items (no prices)",
        parameters: [query("category", { type: "string" })],
        responses: ok(arrayOf("PublicFoodItem")),
      },
    },
    "/api/food/categories": {
      get: {
        tags: ["food"],
        summary: "Categories with available items",
        responses: ok({ type: "array", items: { type: "object", properties: { name: { type: "string" }, count: { type: "integer" } } } }),
      },
    },
    "/api/admin/food": {
      get: { tags: ["admin"], summary: "All menu items with prices", security: admin, responses: ok(arrayOf("FoodItem")) },
      post: {
        tags: ["admin"],
        summary: "Add a menu item",
        security: admin,
        requestBody: body(ref("UpsertFood")),
        responses: { ...ok(ref("FoodItem"), "201"), ...errors(400, 401) },
      },
    },
    "/api/admin/food/{id}": {
      patch: {
        tags: ["admin"],
        summary: "Edit a menu item",
        security: admin,
        parameters: [idParam()],
        requestBody: body(ref("UpsertFood")),
        responses: { ...ok(ref("FoodItem")), ...errors(400, 401, 404) },
      },
      delete: {
        tags: ["admin"],
        summary: "Delete a menu item",
        security: admin,
        parameters: [idParam()],
        responses: { "204": { description: "Deleted" }, ...errors(401, 404) },
      },
    },
    "/api/admin/food/{id}/toggle": {
      patch: {
        tags: ["admin"],
        summary: "Toggle availability",
        security: admin,
        parameters: [idParam()],
        responses: { ...ok(ref("FoodItem")), ...errors(401, 404) },
      },
    },
    "/api/settings/public": {
      get: { tags: ["settings"], summary: "Arena name, hours and booking window", responses: ok(ref("Settings")) },
    },
    "/api/admin/settings": {
      get: { tags: ["admin"], summary: "Settings", security: admin, responses: ok(ref("Settings")) },
      put: {
        tags: ["admin"],
        summary: "Update operating hours, slot length, booking window or name",
        security: admin,
        requestBody: body(ref("Settings")),
        responses: { ...ok(ref("Settings")), ...errors(400, 401) },
      },
    },
    "/api/admin/dashboard/{metric}": {
      get: {
        tags: ["admin"],
        summary: "Dashboard data built with aggregation pipelines",
        security: admin,
        parameters: [
          { name: "metric", in: "path", required: true, schema: { type: "string", enum: ["stats", "bookings-per-day", "peak-hours", "usage-by-type", "status-split"] } },
          query("days", { type: "integer", minimum: 1, maximum: 90 }, false, "7 for bookings-per-day, otherwise 30 by default"),
        ],
        responses: { ...ok({ type: "object" }), ...errors(401, 404) },
      },
    },
    "/api/live": {
      get: {
        tags: ["live"],
        summary: "Change counter; clients refetch when it moves",
        responses: ok({ type: "object", properties: { revision: { type: "integer" } } }),
      },
    },
    "/api/admin/live": {
      get: {
        tags: ["admin"],
        summary: "Change counter plus pending requests created since `since`",
        security: admin,
        parameters: [query("since", { type: "string", format: "date-time" })],
        responses: ok({
          type: "object",
          properties: { revision: { type: "integer" }, newRequests: arrayOf("Booking"), serverTime: { type: "string", format: "date-time" } },
        }),
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Sign in; sets the httpOnly session cookie. 5/min per IP",
        requestBody: body({
          type: "object",
          required: ["email", "password"],
          properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
        }),
        responses: { ...ok({ type: "object" }), ...errors(400, 401, 429) },
      },
    },
    "/api/auth/logout": { post: { tags: ["auth"], summary: "Clear the session cookie", responses: { "204": { description: "Signed out" } } } },
    "/api/auth/me": { get: { tags: ["auth"], summary: "Current admin", security: admin, responses: { ...ok(ref("Admin")), ...errors(401) } } },
  },
  components: {
    securitySchemes: {
      adminCookie: { type: "apiKey", in: "cookie", name: "d8_admin" },
      bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          statusCode: { type: "integer" },
          error: { type: "string" },
          message: { type: "string" },
          details: { type: "array", items: { type: "string" } },
          path: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      Unit: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          type: unitType,
          status: { type: "string", enum: ["free", "busy", "maintenance"] },
          busyUntil: { type: "string", format: "date-time", nullable: true },
          isActive: { type: "boolean" },
        },
      },
      CreateUnit: {
        type: "object",
        required: ["name", "type"],
        properties: { name: { type: "string" }, type: unitType, isActive: { type: "boolean" } },
      },
      UnitsSummary: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: { total: { type: "integer" }, free: { type: "integer" }, nextFreeAt: { type: "string", format: "date-time" } },
        },
      },
      Availability: {
        type: "object",
        properties: {
          type: unitType,
          date: isoDate,
          hours: { type: "array", items: { type: "integer" } },
          units: {
            type: "array",
            items: {
              type: "object",
              properties: {
                unit: ref("Unit"),
                slots: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      startHour: { type: "integer" },
                      startsAt: { type: "string", format: "date-time" },
                      endsAt: { type: "string", format: "date-time" },
                      state: { type: "string", enum: ["available", "pending", "booked", "busy", "maintenance", "past"] },
                    },
                  },
                },
              },
            },
          },
          generatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateBooking: {
        type: "object",
        required: ["unitId", "businessDate", "startHour", "customerName", "customerPhone"],
        properties: {
          unitId: { type: "string" },
          businessDate: isoDate,
          startHour: { type: "integer", minimum: 0, maximum: 23 },
          customerName: { type: "string", minLength: 2, maxLength: 60 },
          customerPhone: { type: "string", example: "+91 98765 43210" },
        },
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string" },
          unitId: { type: "string" },
          unitName: { type: "string" },
          unitType,
          businessDate: isoDate,
          startHour: { type: "integer" },
          durationHours: { type: "integer" },
          startsAt: { type: "string", format: "date-time" },
          endsAt: { type: "string", format: "date-time" },
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          status: bookingStatus,
          source: { type: "string", enum: ["online", "walk-in"] },
          rejectionReason: { type: "string", nullable: true },
          approvedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      BookingPage: {
        type: "object",
        properties: {
          items: arrayOf("Booking"),
          total: { type: "integer" },
          page: { type: "integer" },
          pageSize: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      BlockedSlot: {
        type: "object",
        properties: {
          id: { type: "string" },
          unitId: { type: "string" },
          unitName: { type: "string" },
          businessDate: isoDate,
          startHour: { type: "integer" },
          reason: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      PublicFoodItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          category: { type: "string" },
          description: { type: "string" },
          imageUrl: { type: "string" },
          sortOrder: { type: "integer" },
        },
      },
      FoodItem: {
        allOf: [
          ref("PublicFoodItem"),
          { type: "object", properties: { price: { type: "number", nullable: true }, isAvailable: { type: "boolean" } } },
        ],
      },
      UpsertFood: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          description: { type: "string" },
          imageUrl: { type: "string" },
          price: { type: "number", nullable: true },
          isAvailable: { type: "boolean" },
          sortOrder: { type: "integer" },
        },
      },
      Settings: {
        type: "object",
        properties: {
          arenaName: { type: "string" },
          openHour: { type: "integer", minimum: 0, maximum: 23 },
          closeHour: { type: "integer", minimum: 0, maximum: 23 },
          slotDurationHours: { type: "integer", minimum: 1, maximum: 4 },
          bookingWindowDays: { type: "integer", minimum: 1, maximum: 14 },
        },
      },
      Admin: { type: "object", properties: { id: { type: "string" }, email: { type: "string" }, name: { type: "string" } } },
    },
  },
} as const;
