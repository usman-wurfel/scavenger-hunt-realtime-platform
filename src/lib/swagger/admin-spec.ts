import type { OpenAPIV3 } from "openapi-types";

import { SWAGGER_EXAMPLE_PATHS } from "@/lib/swagger/helpers";

export const adminOpenApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Scavenger Hunt — Admin API",
    version: "1.0.0",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Admin Auth" },
    { name: "Admin Profile" },
    { name: "Proximity Alerts", description: "Alert templates for hunt creation" },
    { name: "Hunts", description: "Scavenger hunt management" },
    { name: "Areas", description: "Hunt audience and location areas" },
    { name: "Push", description: "Admin push notifications to app users" },
  ],
  paths: {
    "/api/auth/login": {
      post: {
        tags: ["Admin Auth"],
        summary: "Admin login",
        description:
          "Authenticates an admin. Optionally send `deviceId` and `fcmToken`; each is saved only when the value changes.",
        operationId: "adminLogin",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminLoginRequest" },
              example: {
                email: "admin@gmail.com",
                password: "admin1",
                deviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                fcmToken: "fcm-admin-device-token-abc123xyz",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminLoginResponse" },
              },
            },
          },
          "400": { description: "Missing email or password", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Admin Auth"],
        summary: "Admin logout",
        operationId: "adminLogout",
        security: [{ adminBearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: {
                    success: { type: "boolean", enum: [true], example: true },
                    message: { type: "string", example: "Logged out successfully" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/profile": {
      get: {
        tags: ["Admin Profile"],
        summary: "Get admin profile",
        operationId: "getAdminProfile",
        security: [{ adminBearerAuth: [] }],
        responses: {
          "200": {
            description: "Admin profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminProfileResponse" },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Admin not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      put: {
        tags: ["Admin Profile"],
        summary: "Update admin profile",
        description: "Updates name and profile photo. Email cannot be changed.",
        operationId: "updateAdminProfile",
        security: [{ adminBearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/AdminProfileUpdateForm" },
            },
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminProfileUpdateRequest" },
              example: {
                name: "Admin",
                profilePhoto: "/uploads/profilePhoto/profilePhoto-1234567890.png",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminProfileUpdateResponse" },
              },
            },
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { description: "Update failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/profile/password": {
      put: {
        tags: ["Admin Profile"],
        summary: "Change admin password",
        description:
          "Updates the logged-in admin password. Requires the current password. Email cannot be changed via profile APIs.",
        operationId: "changeAdminPassword",
        security: [{ adminBearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminPasswordChangeRequest" },
              example: {
                currentPassword: "admin1",
                newPassword: "newpassword123",
                confirmPassword: "newpassword123",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminPasswordChangeResponse" },
              },
            },
          },
          "400": {
            description: "Validation error or incorrect current password",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Admin not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { description: "Update failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/dashboard": {
      get: {
        tags: ["Admin Profile"],
        summary: "Dashboard overview",
        description:
          "Returns KPI stats, hunt status distribution, and 7-day activity charts. Hunt lists are paginated via GET /api/dashboard/hunts.",
        operationId: "getDashboardOverview",
        security: [{ adminBearerAuth: [] }],
        responses: {
          "200": {
            description: "Dashboard overview payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardOverviewResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/dashboard/hunts": {
      get: {
        tags: ["Admin Profile"],
        summary: "Paginated dashboard hunt lists",
        description:
          "Returns a paginated hunt list for dashboard sections: today (all started hunts plus today's scheduled), upcoming, ended, or top (by player count; started hunts first).",
        operationId: "getDashboardHunts",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "type",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["today", "upcoming", "ended", "top"] },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 0, default: 0 },
            description: "Zero-based page index",
          },
          {
            name: "pageSize",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 6 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated dashboard hunt list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardHuntListResponse" },
              },
            },
          },
          "400": {
            description: "Invalid query",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/proximity-alerts": {
      get: {
        tags: ["Proximity Alerts"],
        summary: "List proximity alert templates",
        description:
          "Returns all saved alert types (id, distance in ft, message, text color). Call this before creating a hunt to preview which proximity alerts will be attached.",
        operationId: "listProximityAlerts",
        security: [{ adminBearerAuth: [] }],
        responses: {
          "200": {
            description: "Proximity alert templates",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProximityAlertsListResponse" },
                example: {
                  success: true,
                  proximityAlerts: [
                    {
                      id: "clxyz123",
                      distanceFt: 150,
                      message: "Getting Closer",
                      messageColor: "#000000",
                    },
                    {
                      id: "clxyz456",
                      distanceFt: 75,
                      message: "Getting Warmer",
                      messageColor: "#ffa200",
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts": {
      post: {
        tags: ["Hunts"],
        summary: "Create hunt",
        description:
          "Creates a scavenger hunt with status `scheduled` or `started`, generates a QR code containing the hunt code (`huntCode`), and attaches selected proximity alerts. Multiple hunts can exist. If `status` is `started`, any currently started hunt is automatically ended and the new hunt begins immediately. If `status` is `scheduled`, the hunt auto-starts at `huntDate` + `huntTime`; at that moment any other started hunt is ended first and the scheduled hunt becomes active. For scheduled hunts, players receive `hunt_starting_soon` pushes at **30 minutes** and again at **5 minutes** before start (or immediately with remaining minutes if start is sooner).",
        operationId: "createHunt",
        security: [{ adminBearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateHuntRequest" },
              example: {
                huntName: "Downtown Hunt",
                location: "Central Park, New York",
                latitude: 40.7829,
                longitude: -73.9654,
                huntDate: "2026-07-15",
                huntTime: "14:30",
                huntCode: "HUNT2026",
                playerClue: "Find the statue near the fountain",
                playerNearbyRadiusFt: 100,
                proximityAlertIds: ["clxyz456", "clxyz789"],
                status: "scheduled",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Hunt created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateHuntResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Server error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/history": {
      get: {
        tags: ["Hunts"],
        summary: "Hunt history",
        description:
          "Returns hunts for history. Use optional `type` to filter (`scheduled`, `started`, `ended`). Without `type`, all statuses are returned with `started` first. Sorted by `huntDate` and `huntTime` descending. Supports pagination.",
        operationId: "getHuntHistory",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "type",
            in: "query",
            schema: {
              type: "string",
              enum: ["scheduled", "started", "ended"],
            },
            description: "Filter by hunt status. Only matching hunts are returned.",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "One-based page number (page 1 is the first page)",
          },
          {
            name: "pageSize",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            description: "Items per page",
          },
        ],
        responses: {
          "200": {
            description: "All hunts (scheduled, started, ended)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HuntHistoryResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "400": {
            description: "Invalid type filter",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/validate-datetime": {
      get: {
        tags: ["Hunts"],
        summary: "Validate hunt date and time",
        description:
          "Checks whether the given `eventDatetime` is available. Returns an error if another hunt is already scheduled or in progress at the same date and time (current or future). Past ended hunts do not block availability. Use optional `excludeHuntId` when updating an existing hunt.",
        operationId: "validateHuntDatetime",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "eventDatetime",
            in: "query",
            required: true,
            schema: {
              type: "string",
              example: "2026-07-15T14:30",
            },
            description: "Hunt start date and time in `YYYY-MM-DDTHH:mm` format (24-hour, app timezone from Settings).",
          },
          {
            name: "excludeHuntId",
            in: "query",
            schema: { type: "string" },
            description: "Optional hunt ID to exclude (useful when updating an existing hunt).",
          },
        ],
        responses: {
          "200": {
            description: "Datetime is available",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidateHuntDatetimeResponse" },
              },
            },
          },
          "400": {
            description: "Invalid eventDatetime",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "409": {
            description: "Another hunt already exists at this date and time",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/validate-code": {
      get: {
        tags: ["Hunts"],
        summary: "Validate hunt code uniqueness",
        description:
          "Checks whether a `huntCode` is valid and unique before create/update.\n\n" +
          "**Allowed rules (all must pass):**\n" +
          "1. `huntCode` is required (non-empty query param).\n" +
          "2. Length must be **4–15** characters after trim.\n" +
          "3. Only **uppercase letters A–Z** and **digits 0–9** are allowed (lowercase is auto-uppercased).\n" +
          "4. Spaces/symbols/special characters are **not** allowed.\n" +
          "5. Code must be **unique** across all hunts in the database (any status: scheduled, started, ended).\n" +
          "6. Optional `excludeHuntId`: when updating an existing hunt, pass that hunt's id so its current code is treated as available.\n\n" +
          "**Validation test cases:**\n" +
          "- Missing / empty `huntCode` → `400`\n" +
          "- Too short (`ABC`) → `400`\n" +
          "- Too long (16+ chars) → `400`\n" +
          "- Invalid chars (`HUNT-01`, `hunt code`, `HUNT_01`) → `400`\n" +
          "- Valid unique code (`HUNT2026`) → `200` `{ available: true }`\n" +
          "- Lowercase input (`hunt2026`) → normalized to `HUNT2026`, then uniqueness check\n" +
          "- Already used by another hunt → `409`\n" +
          "- Same code as hunt being edited + matching `excludeHuntId` → `200`",
        operationId: "validateHuntCode",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "huntCode",
            in: "query",
            required: true,
            schema: {
              type: "string",
              minLength: 4,
              maxLength: 15,
              pattern: "^[A-Za-z0-9]{4,15}$",
              example: "HUNT2026",
            },
            description:
              "Hunt code to validate. Allowed: 4–15 chars, A–Z / 0–9 only (case-insensitive; stored uppercase).",
          },
          {
            name: "excludeHuntId",
            in: "query",
            schema: { type: "string" },
            description: "Optional hunt ID to exclude (use when editing an existing hunt's code).",
          },
        ],
        responses: {
          "200": {
            description: "Hunt code is available",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidateHuntCodeResponse" },
                examples: {
                  available: {
                    summary: "Code available",
                    value: {
                      success: true,
                      available: true,
                      message: "This hunt code is available.",
                      huntCode: "HUNT2026",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid huntCode format",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  required: {
                    summary: "Missing code",
                    value: { success: false, error: "huntCode is required" },
                  },
                  invalid: {
                    summary: "Invalid format",
                    value: {
                      success: false,
                      error:
                        "huntCode must be 4-15 characters using only uppercase letters (A-Z) and digits (0-9)",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "409": {
            description: "Hunt code already in use",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  taken: {
                    summary: "Code taken",
                    value: {
                      success: false,
                      error: "This hunt code is already in use. Please choose another code.",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/hunts/{id}": {
      get: {
        tags: ["Hunts"],
        summary: "Hunt detail",
        description:
          "Returns full hunt details with paginated participants. When the hunt status is `started`, the response also includes `mqtt` connection details for subscribing to live `totalJoined`, `scanCount`, and `nearbyCount` stats.",
        operationId: "getHuntDetail",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "One-based participant page number",
          },
          {
            name: "pageSize",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            description: "Participants per page",
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Filter participants by username, device ID, or scan rank",
          },
        ],
        responses: {
          "200": {
            description: "Hunt detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HuntDetailResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Hunt not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
      put: {
        tags: ["Hunts"],
        summary: "Update hunt",
        description:
          "Updates a hunt by status. **Scheduled** hunts: `huntName`, `location`, `latitude`, `longitude`, `huntDate`, `huntTime`, `playerClue`, `proximityAlertIds`, optional `playerNearbyRadiusFt` and `huntCode` (new QR if code changes). Optional `status`: send `started` to save edits **and immediately start** the hunt (ends any other started hunt, sends hunt-started push + MQTT), just like create. Default keeps it `scheduled`. **Started** hunts: only `playerClue` and/or `playerNearbyRadiusFt`. Ended hunts cannot be updated.",
        operationId: "updateHunt",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateHuntRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Hunt updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateHuntResponse" },
              },
            },
          },
          "400": {
            description: "Validation error or ended hunt",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Hunt not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Update failed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
      delete: {
        tags: ["Hunts"],
        summary: "Delete hunt",
        description:
          "Permanently deletes a hunt by ID. Removes linked participants, proximity alerts, and the QR code file from storage.",
        operationId: "deleteHunt",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Hunt deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeleteHuntResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Hunt not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Delete failed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/{id}/first-place": {
      get: {
        tags: ["Hunts"],
        summary: "Get first-place winner + prize status",
        description:
          "Admin mobile/web: returns the hunt's rank-1 winner and prize claim status (`none` | `waiting` | `claimed`). No `participantId` needed — resolves scanRank 1 automatically. Auth: Bearer JWT from admin login.",
        operationId: "getHuntFirstPlace",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Hunt event id",
          },
        ],
        responses: {
          "200": {
            description: "First-place winner found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FirstPlacePrizeResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Hunt not found, or no first-place winner yet",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Server error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/{id}/first-place/message": {
      post: {
        tags: ["Hunts"],
        summary: "Send prize message to first-place winner",
        description:
          "Admin: saves the prize collection message for the hunt's rank-1 winner, sets status to `waiting`, sends FCM (`type`/`event`: `claim_now`) and MQTT on that winner's device prize topic only. Rejected with 400 if prize is already `claimed`. Body: `{ \"message\": \"...\" }` (1–1000 chars). No `participantId` required.",
        operationId: "sendHuntFirstPlaceMessage",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Hunt event id",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: {
                    type: "string",
                    minLength: 1,
                    maxLength: 1000,
                    example: "Collect your prize at the main desk near Gate A.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Message saved and push attempted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FirstPlaceMessageResponse" },
              },
            },
          },
          "400": {
            description:
              "Validation error, prize already claimed, winner has no FCM token, or Firebase push failed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Hunt not found, or no first-place winner yet",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Server error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/{id}/first-place/claim": {
      post: {
        tags: ["Hunts"],
        summary: "Mark first-place prize as claimed",
        description:
          "Admin: marks the hunt's rank-1 winner prize as `claimed`. Sends FCM (`type`/`event`: `claimed`) + MQTT on that winner's device prize topic only. Idempotent if already claimed (no second event). No `participantId` required.",
        operationId: "claimHuntFirstPlacePrize",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Hunt event id",
          },
        ],
        responses: {
          "200": {
            description: "Marked as claimed (or already claimed)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FirstPlaceClaimResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Hunt not found, or no first-place winner yet",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Server error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/{id}/live-positions": {
      get: {
        tags: ["Hunts"],
        summary: "Live joined-player GPS snapshot",
        description:
          "Admin: returns the current online joined-player positions for the live map (green dots). Same payload as MQTT `topics.positions`. Empty when the hunt is not started. Scales via Redis GEO batching — safe for thousands of players.",
        operationId: "getHuntLivePositions",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Hunt event id",
          },
        ],
        responses: {
          "200": {
            description: "Live positions snapshot",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HuntLivePositionsResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Hunt not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/{id}/broadcast-message": {
      post: {
        tags: ["Hunts"],
        summary: "Broadcast message to joined players",
        description:
          "Admin web/mobile: sends a one-off FCM push (`type`/`event`: `admin_message`) and MQTT event to **joined players only** in a **started** hunt. Message is **not** saved. Optimized for thousands of players (paginated + parallel FCM/MQTT).",
        operationId: "broadcastHuntMessage",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Hunt event id",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: {
                    type: "string",
                    minLength: 1,
                    maxLength: 1000,
                    example: "Head to the north gate — clue update!",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Broadcast sent",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HuntBroadcastMessageResponse" },
              },
            },
          },
          "400": {
            description: "Validation error, hunt not started, or no FCM tokens",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Hunt not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Server error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/push/broadcast-all": {
      post: {
        tags: ["Push"],
        summary: "Broadcast message to users in an area",
        description:
          "Admin web/mobile: sends a one-off FCM push (`type`/`event`: `app_broadcast`) only to registered devices subscribed to the selected active area. Message is not saved. The FCM data payload includes `areaId`.",
        operationId: "broadcastAllAppUsers",
        security: [{ adminBearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message", "areaId"],
                properties: {
                  areaId: {
                    type: "string",
                    description: "Active area whose subscribed devices should receive the push",
                  },
                  message: {
                    type: "string",
                    minLength: 1,
                    maxLength: 1000,
                    example: "New hunts drop this Saturday — update your app!",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Broadcast sent",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppBroadcastMessageResponse" },
              },
            },
          },
          "400": {
            description: "Validation error, Firebase unavailable, or no FCM tokens",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Server error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/{id}/end": {
      post: {
        tags: ["Hunts"],
        summary: "End hunt",
        description:
          "Changes hunt status from `scheduled` or `started` to `ended`. The returned `hunt` includes `endedAt` (date and time when the hunt ended).",
        operationId: "endHunt",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Hunt ended",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HuntActionResponse" },
              },
            },
          },
          "400": {
            description: "Hunt cannot be ended",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Hunt not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Server error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/admin/areas": {
      get: {
        tags: ["Areas"],
        summary: "List all hunt areas",
        security: [{ adminBearerAuth: [] }],
        responses: {
          "200": {
            description: "Areas with hunt and subscriber counts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    areas: { type: "array", items: { $ref: "#/components/schemas/AdminHuntArea" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Areas"],
        summary: "Create hunt area",
        security: [{ adminBearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/HuntAreaInput" } },
          },
        },
        responses: {
          "201": { description: "Area created" },
          "409": { description: "Duplicate name or slug" },
        },
      },
    },
    "/api/admin/areas/{id}": {
      put: {
        tags: ["Areas"],
        summary: "Update hunt area",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/HuntAreaInput" } },
          },
        },
        responses: { "200": { description: "Area updated" } },
      },
      delete: {
        tags: ["Areas"],
        summary: "Delete unused hunt area",
        security: [{ adminBearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Area deleted" },
          "409": { description: "Area is assigned to hunts; disable it instead" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      adminBearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", enum: [false], example: false },
          error: { type: "string" },
        },
      },
      HuntArea: {
        type: "object",
        required: ["id", "name", "slug", "isActive", "sortOrder"],
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "Oshkosh" },
          slug: { type: "string", example: "oshkosh" },
          isActive: { type: "boolean" },
          sortOrder: { type: "integer" },
        },
      },
      HuntAreaSummary: {
        type: "object",
        required: ["id", "name", "slug"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
        },
      },
      AdminHuntArea: {
        allOf: [
          { $ref: "#/components/schemas/HuntArea" },
          {
            type: "object",
            properties: {
              huntCount: { type: "integer", minimum: 0 },
              subscriberCount: { type: "integer", minimum: 0 },
            },
          },
        ],
      },
      HuntAreaInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 80 },
          slug: { type: "string", description: "Optional; generated from name when omitted" },
          isActive: { type: "boolean", default: true },
          sortOrder: { type: "integer", minimum: 0, default: 0 },
        },
      },
      AdminLoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
          deviceId: {
            type: "string",
            minLength: 8,
            maxLength: 128,
            description: "Optional unique device identifier from the mobile app. Saved when changed.",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          },
          fcmToken: {
            type: "string",
            maxLength: 512,
            description: "Optional Firebase Cloud Messaging device token. Saved when changed.",
            example: "fcm-admin-device-token-abc123xyz",
          },
        },
      },
      AdminLoginResponse: {
        type: "object",
        required: ["success", "token", "admin"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          token: { type: "string" },
          admin: {
            type: "object",
            required: ["id", "email", "name"],
            properties: {
              id: { type: "string" },
              email: { type: "string", format: "email" },
              name: { type: "string" },
              profilePhoto: {
                type: "string",
                nullable: true,
                description: "Full URL to the admin profile photo",
              },
            },
          },
        },
      },
      AdminProfileResponse: {
        type: "object",
        required: ["success", "admin"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          admin: { $ref: "#/components/schemas/AdminProfile" },
        },
      },
      AdminProfileUpdateResponse: {
        type: "object",
        required: ["success", "admin", "token"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          token: { type: "string" },
          admin: { $ref: "#/components/schemas/AdminProfile" },
        },
      },
      DashboardOverviewResponse: {
        type: "object",
        required: ["success", "stats", "huntsByStatus", "activityLast7Days"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          stats: { $ref: "#/components/schemas/DashboardStats" },
          huntsByStatus: { $ref: "#/components/schemas/DashboardHuntsByStatus" },
          activityLast7Days: {
            type: "array",
            items: { $ref: "#/components/schemas/DashboardDayActivity" },
          },
        },
      },
      DashboardHuntListResponse: {
        type: "object",
        required: ["success", "type", "pagination"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          type: { type: "string", enum: ["today", "upcoming", "ended", "top"] },
          hunts: {
            type: "array",
            items: { $ref: "#/components/schemas/HuntHistoryItem" },
          },
          topHunts: {
            type: "array",
            items: { $ref: "#/components/schemas/DashboardTopHunt" },
          },
          pagination: { $ref: "#/components/schemas/PaginationMeta" },
        },
      },
      DashboardStats: {
        type: "object",
        required: [
          "totalHunts",
          "todayHunts",
          "todayDashboardHunts",
          "activeHunts",
          "scheduledHunts",
          "upcomingHunts",
          "endedHunts",
          "totalParticipants",
          "todayParticipants",
          "totalScans",
          "todayScans",
          "alertTypes",
          "playerNearbyRadius",
        ],
        properties: {
          totalHunts: { type: "integer", minimum: 0 },
          todayHunts: { type: "integer", minimum: 0 },
          todayDashboardHunts: { type: "integer", minimum: 0 },
          activeHunts: { type: "integer", minimum: 0 },
          scheduledHunts: { type: "integer", minimum: 0 },
          upcomingHunts: { type: "integer", minimum: 0 },
          endedHunts: { type: "integer", minimum: 0 },
          totalParticipants: { type: "integer", minimum: 0 },
          todayParticipants: { type: "integer", minimum: 0 },
          totalScans: { type: "integer", minimum: 0 },
          todayScans: { type: "integer", minimum: 0 },
          alertTypes: { type: "integer", minimum: 0 },
          playerNearbyRadius: { type: "number", minimum: 1 },
        },
      },
      DashboardHuntsByStatus: {
        type: "object",
        required: ["scheduled", "started", "ended"],
        properties: {
          scheduled: { type: "integer", minimum: 0 },
          started: { type: "integer", minimum: 0 },
          ended: { type: "integer", minimum: 0 },
        },
      },
      DashboardDayActivity: {
        type: "object",
        required: ["date", "label", "hunts", "joins", "scans"],
        properties: {
          date: { type: "string", format: "date" },
          label: { type: "string", example: "Mon" },
          hunts: { type: "integer", minimum: 0 },
          joins: { type: "integer", minimum: 0 },
          scans: { type: "integer", minimum: 0 },
        },
      },
      DashboardTopHunt: {
        type: "object",
        required: ["id", "huntName", "status", "participantCount", "scanCount"],
        properties: {
          id: { type: "string" },
          huntName: { type: "string" },
          status: { type: "string" },
          participantCount: { type: "integer", minimum: 0 },
          scanCount: { type: "integer", minimum: 0 },
        },
      },
      AdminProfile: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          profilePhoto: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AdminProfileUpdateRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          profilePhoto: { type: "string", nullable: true },
        },
      },
      AdminProfileUpdateForm: {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "string",
            example: "Admin",
            description: "Admin display name",
          },
          profilePhoto: {
            type: "string",
            format: "binary",
            description: "Profile image file (PNG, JPG, WEBP, SVG — max 2MB). Optional.",
          },
        },
      },
      AdminPasswordChangeRequest: {
        type: "object",
        required: ["currentPassword", "newPassword", "confirmPassword"],
        properties: {
          currentPassword: { type: "string", format: "password" },
          newPassword: { type: "string", format: "password", minLength: 6 },
          confirmPassword: { type: "string", format: "password", minLength: 6 },
        },
      },
      AdminPasswordChangeResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          message: { type: "string", example: "Password updated successfully" },
        },
      },
      ProximityAlert: {
        type: "object",
        required: ["id", "distanceFt", "message", "messageColor"],
        properties: {
          id: { type: "string", description: "Alert template ID (from GET /api/proximity-alerts)" },
          distanceFt: { type: "number", minimum: 1, description: "Distance (ft)" },
          message: { type: "string", description: "Alert message" },
          messageColor: { type: "string", example: "#000000", description: "Text color" },
        },
      },
      HuntProximityAlert: {
        type: "object",
        required: ["id", "alertTypeId", "distanceFt", "message", "messageColor"],
        properties: {
          id: { type: "string", description: "Hunt proximity alert record ID" },
          alertTypeId: { type: "string", description: "Selected alert template ID" },
          distanceFt: { type: "number", minimum: 1, description: "Distance (ft)" },
          message: { type: "string", description: "Alert message" },
          messageColor: { type: "string", example: "#000000", description: "Text color" },
        },
      },
      ProximityAlertsListResponse: {
        type: "object",
        required: ["success", "proximityAlerts"],
        properties: {
          success: { type: "boolean", enum: [true] },
          proximityAlerts: {
            type: "array",
            items: { $ref: "#/components/schemas/ProximityAlert" },
          },
        },
      },
      CreateHuntRequest: {
        type: "object",
        required: [
          "areaId",
          "huntName",
          "location",
          "latitude",
          "longitude",
          "huntDate",
          "huntTime",
          "playerClue",
          "proximityAlertIds",
        ],
        properties: {
          areaId: {
            type: "string",
            description: "Required active area ID from GET /api/admin/areas",
          },
          huntName: { type: "string" },
          location: { type: "string" },
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },
          huntDate: { type: "string", format: "date", example: "2026-07-15" },
          huntTime: {
            type: "string",
            example: "16:00",
            description: "24-hour HH:mm in the app timezone from Settings.",
          },
          huntCode: {
            type: "string",
            description: "Optional. Auto-generated if omitted. 4-15 uppercase letters or numbers.",
            example: "HUNT2026",
          },
          playerClue: { type: "string" },
          playerNearbyRadiusFt: {
            type: "number",
            minimum: 1,
            description: "Player nearby radius in feet (ft). Optional — defaults to app settings when omitted.",
            example: 100,
          },
          proximityAlertIds: {
            type: "array",
            minItems: 1,
            description: "Selected alert template IDs from GET /api/proximity-alerts. One or more allowed.",
            items: { type: "string" },
            example: ["clxyz456", "clxyz789"],
          },
          status: {
            type: "string",
            enum: ["scheduled", "started"],
            default: "scheduled",
            description:
              "Initial hunt status. Use `scheduled` for a future hunt or `started` to begin immediately.",
          },
        },
      },
      Hunt: {
        type: "object",
        required: [
          "id",
          "huntName",
          "location",
          "latitude",
          "longitude",
          "huntDate",
          "huntTime",
          "timezone",
          "huntCode",
          "playerClue",
          "playerNearbyRadiusFt",
          "status",
          "qrCodeUrl",
          "proximityAlerts",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id: { type: "string" },
          area: {
            allOf: [{ $ref: "#/components/schemas/HuntAreaSummary" }],
            nullable: true,
            description: "Null only for legacy hunts created before Areas were introduced",
          },
          huntName: { type: "string" },
          location: { type: "string" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          huntDate: { type: "string", format: "date" },
          huntTime: { type: "string", description: "24-hour HH:mm in app Settings timezone" },
          timezone: {
            type: "string",
            example: "America/Chicago",
            readOnly: true,
            description: "Copied from Settings timezone when the hunt is created or rescheduled.",
          },
          huntCode: { type: "string" },
          playerClue: { type: "string" },
          playerNearbyRadiusFt: {
            type: "number",
            minimum: 1,
            description: "Player nearby radius in feet (ft)",
          },
          status: {
            type: "string",
            enum: ["scheduled", "started", "ended"],
            example: "scheduled",
          },
          qrCodeUrl: {
            type: "string",
            nullable: true,
            description: "QR code image path (`/uploads/...`). Prefix with server URL when needed.",
            example: SWAGGER_EXAMPLE_PATHS.qrCodeImage,
          },
          qrScanUrl: {
            type: "string",
            description: "Convenience scan URL derived from `huntCode`. The QR image itself now encodes only the raw hunt code.",
            example: SWAGGER_EXAMPLE_PATHS.scanPath,
          },
          proximityAlerts: {
            type: "array",
            items: { $ref: "#/components/schemas/HuntProximityAlert" },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          endedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Date and time when the hunt was ended (null if not ended yet)",
          },
        },
      },
      CreateHuntResponse: {
        type: "object",
        required: ["success", "hunt"],
        properties: {
          success: { type: "boolean", enum: [true] },
          hunt: { $ref: "#/components/schemas/Hunt" },
        },
      },
      UpdateHuntRequest: {
        type: "object",
        description:
          "Scheduled hunts require create-like fields. Started hunts accept only playerClue and/or playerNearbyRadiusFt.",
        properties: {
          areaId: {
            type: "string",
            description: "Required when editing a scheduled hunt",
          },
          huntName: { type: "string" },
          location: { type: "string" },
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },
          huntDate: { type: "string", format: "date" },
          huntTime: { type: "string", description: "24-hour HH:mm" },
          huntCode: {
            type: "string",
            description: "Optional on update. Omit to keep current code. New code regenerates the QR image.",
          },
          playerClue: { type: "string" },
          playerNearbyRadiusFt: { type: "number", minimum: 1 },
          proximityAlertIds: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          status: {
            type: "string",
            enum: ["scheduled", "started"],
            description:
              "Scheduled hunts only. `started` saves edits and immediately starts the hunt (ends other started hunt, sends push + MQTT). Omit or `scheduled` to keep it scheduled.",
          },
        },
      },
      UpdateHuntResponse: {
        type: "object",
        required: ["success", "hunt"],
        properties: {
          success: { type: "boolean", enum: [true] },
          hunt: { $ref: "#/components/schemas/Hunt" },
        },
      },
      HuntMqttConnectionInfo: {
        type: "object",
        required: ["brokerUrl", "wsUrl", "clientId", "username", "topics", "locationIntervalSec"],
        properties: {
          brokerUrl: { type: "string" },
          wsUrl: { type: "string" },
          clientId: { type: "string" },
          username: { type: "string" },
          password: { type: "string", nullable: true },
          topics: {
            type: "object",
            required: ["live", "start", "end", "location", "prize", "adminMessage", "positions"],
            properties: {
              live: { type: "string" },
              start: {
                type: "string",
                description: "Subscribe for retained hunt-started event payload",
              },
              end: {
                type: "string",
                description: "Subscribe for retained hunt-ended event payload",
              },
              location: { type: "string", nullable: true },
              prize: {
                type: "string",
                nullable: true,
                description:
                  "Winner prize topic: claim_now / claimed events for this device only",
              },
              adminMessage: {
                type: "string",
                nullable: true,
                description:
                  "Joined-player admin broadcast topic (`admin_message`) for this device only",
              },
              positions: {
                type: "string",
                nullable: true,
                example: "hunts/clxyz123/positions",
                description:
                  "Admin-only retained live map snapshot. Payload `event` is `positions` with compact `{ d, lat, lng }` players. Null for player MQTT. Republished ~every 3–5s; do NOT subscribe to per-player location wildcards (not 5k-safe).",
              },
            },
          },
          locationIntervalSec: { type: "integer", example: 3 },
        },
      },
      HuntLivePositionsResponse: {
        type: "object",
        required: ["success", "event", "huntId", "at", "count", "players"],
        properties: {
          success: { type: "boolean", enum: [true] },
          event: { type: "string", enum: ["positions"] },
          huntId: { type: "string" },
          at: { type: "string", format: "date-time" },
          count: { type: "integer", minimum: 0 },
          latitude: { type: "number" },
          longitude: { type: "number" },
          radiusFt: { type: "number" },
          players: {
            type: "array",
            items: {
              type: "object",
              required: ["d", "lat", "lng"],
              properties: {
                d: { type: "string", description: "deviceId" },
                lat: { type: "number" },
                lng: { type: "number" },
              },
            },
          },
        },
      },
      HuntActionResponse: {
        type: "object",
        required: ["success", "hunt"],
        properties: {
          success: { type: "boolean", enum: [true] },
          hunt: { $ref: "#/components/schemas/Hunt" },
        },
      },
      HuntDetailResponse: {
        type: "object",
        required: ["success", "hunt"],
        properties: {
          success: { type: "boolean", enum: [true] },
          hunt: { $ref: "#/components/schemas/HuntDetail" },
          mqtt: {
            allOf: [{ $ref: "#/components/schemas/HuntMqttConnectionInfo" }],
            nullable: true,
            description:
              "Present when hunt status is started. Subscribe to `topics.live` for counts and `topics.positions` for the live map (green dots). Player GPS is published every `locationIntervalSec` (3s) on each device location topic; the server aggregates into `positions`.",
          },
        },
      },
      DeleteHuntResponse: {
        type: "object",
        required: ["success", "deleted"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          deleted: { type: "boolean", enum: [true], example: true },
        },
      },
      HuntHistoryItem: {
        type: "object",
        required: [
          "id",
          "huntName",
          "location",
          "huntDate",
          "huntTime",
          "timezone",
          "huntCode",
          "status",
          "participantCount",
        ],
        properties: {
          id: { type: "string" },
          huntName: { type: "string" },
          location: { type: "string" },
          huntDate: { type: "string", format: "date", example: "2026-07-15" },
          huntTime: { type: "string", example: "14:30", description: "24-hour HH:mm" },
          huntCode: { type: "string" },
          status: {
            type: "string",
            enum: ["scheduled", "started", "ended"],
          },
          participantCount: { type: "integer", minimum: 0 },
          endedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Date and time when the hunt was ended (null if not ended yet)",
          },
        },
      },
      HuntDetail: {
        allOf: [
          { $ref: "#/components/schemas/Hunt" },
          {
            type: "object",
            required: ["participants", "participantCount", "participantsPagination"],
            properties: {
              participants: {
                type: "array",
                items: { $ref: "#/components/schemas/HuntParticipant" },
              },
              participantCount: {
                type: "integer",
                minimum: 0,
                description: "Total participants for this hunt (all pages)",
              },
              participantsPagination: { $ref: "#/components/schemas/Pagination" },
            },
          },
        ],
      },
      HuntParticipant: {
        type: "object",
        required: [
          "id",
          "username",
          "deviceId",
          "joinedAt",
          "scanRank",
          "scannedAt",
          "prizeClaimStatus",
          "winnerMessage",
          "winnerMessageSentAt",
          "prizeClaimedAt",
        ],
        properties: {
          id: { type: "string" },
          username: { type: "string" },
          deviceId: {
            type: "string",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          },
          joinedAt: { type: "string", format: "date-time" },
          scanRank: { type: "integer", nullable: true },
          scannedAt: { type: "string", format: "date-time", nullable: true },
          prizeClaimStatus: {
            type: "string",
            enum: ["none", "waiting", "claimed"],
            description: "First-place prize flow status (only meaningful when scanRank is 1)",
          },
          winnerMessage: {
            type: "string",
            nullable: true,
            description: "Admin message for prize collection destination",
          },
          winnerMessageSentAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          prizeClaimedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
      },
      FirstPlacePrizeResponse: {
        type: "object",
        required: [
          "success",
          "huntId",
          "huntName",
          "username",
          "status",
          "winnerMessage",
          "winnerMessageSentAt",
          "claimedAt",
        ],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          huntId: { type: "string" },
          huntName: { type: "string" },
          username: { type: "string", example: "Hunter-1234" },
          status: {
            type: "string",
            enum: ["none", "waiting", "claimed"],
            description: "Current prize claim status for the rank-1 winner",
          },
          winnerMessage: {
            type: "string",
            nullable: true,
            example: "Collect your prize at the main desk near Gate A.",
          },
          winnerMessageSentAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          claimedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
      },
      FirstPlaceMessageResponse: {
        type: "object",
        required: ["success", "message", "status", "winnerMessage"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          message: {
            type: "string",
            example: "Winner message sent",
          },
          status: {
            type: "string",
            enum: ["waiting"],
            example: "waiting",
          },
          winnerMessage: {
            type: "string",
            nullable: true,
            example: "Collect your prize at the main desk near Gate A.",
          },
        },
      },
      FirstPlaceClaimResponse: {
        type: "object",
        required: ["success", "message", "status", "claimedAt"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          message: {
            type: "string",
            enum: ["Marked as claimed", "Already claimed"],
          },
          status: {
            type: "string",
            enum: ["claimed"],
            example: "claimed",
          },
          claimedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
      },
      HuntBroadcastMessageResponse: {
        type: "object",
        required: ["success", "message", "sent", "failed", "tokens", "mqtt", "players"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          message: { type: "string", example: "Broadcast sent to joined players" },
          sent: { type: "integer", minimum: 0, description: "FCM pushes delivered" },
          failed: { type: "integer", minimum: 0, description: "FCM pushes failed" },
          tokens: {
            type: "integer",
            minimum: 0,
            description: "Unique FCM tokens targeted",
          },
          mqtt: {
            type: "integer",
            minimum: 0,
            description: "MQTT admin_message events published to joined devices",
          },
          players: {
            type: "integer",
            minimum: 0,
            description: "Joined participants targeted",
          },
        },
      },
      AppBroadcastMessageResponse: {
        type: "object",
        required: ["success", "message", "area", "sent", "failed", "tokens"],
        properties: {
          success: { type: "boolean", enum: [true], example: true },
          message: { type: "string", example: "Broadcast sent to Oshkosh users" },
          area: { $ref: "#/components/schemas/HuntAreaSummary" },
          sent: { type: "integer", minimum: 0, description: "FCM pushes delivered" },
          failed: { type: "integer", minimum: 0, description: "FCM pushes failed" },
          tokens: {
            type: "integer",
            minimum: 0,
            description: "Unique FCM tokens targeted in the selected area",
          },
        },
      },
      ValidateHuntDatetimeResponse: {
        type: "object",
        required: ["success", "available", "message", "huntDate", "huntTime"],
        properties: {
          success: { type: "boolean", enum: [true] },
          available: { type: "boolean", enum: [true] },
          message: {
            type: "string",
            example: "This hunt date and time is available.",
          },
          huntDate: { type: "string", format: "date", example: "2026-07-15" },
          huntTime: { type: "string", example: "14:30", description: "24-hour HH:mm" },
        },
      },
      ValidateHuntCodeResponse: {
        type: "object",
        required: ["success", "available", "message", "huntCode"],
        properties: {
          success: { type: "boolean", enum: [true] },
          available: { type: "boolean", enum: [true] },
          message: {
            type: "string",
            example: "This hunt code is available.",
          },
          huntCode: {
            type: "string",
            example: "HUNT2026",
            description: "Normalized uppercase hunt code",
          },
        },
      },
      HuntHistoryResponse: {
        type: "object",
        required: ["success", "hunts", "pagination"],
        properties: {
          success: { type: "boolean", enum: [true] },
          hunts: {
            type: "array",
            items: { $ref: "#/components/schemas/HuntHistoryItem" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      Pagination: {
        type: "object",
        required: ["page", "pageSize", "total", "totalPages"],
        properties: {
          page: { type: "integer", minimum: 0 },
          pageSize: { type: "integer", minimum: 1 },
          total: { type: "integer", minimum: 0 },
          totalPages: { type: "integer", minimum: 0 },
        },
      },
    },
  },
};
