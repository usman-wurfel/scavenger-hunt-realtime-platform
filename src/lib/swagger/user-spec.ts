import type { OpenAPIV3 } from "openapi-types";

export const userOpenApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Scavenger Hunt User",
    version: "1.0.0",
    description: "Player / user mobile app APIs. No authentication required.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Hunts", description: "Active hunt availability and joining for players" },
  ],
  paths: {
    "/api/hunts/active": {
      get: {
        tags: ["Hunts"],
        summary: "Get currently active hunt",
        description:
          "Returns the hunt that is currently started in `data` (only `started` status). Also returns `todayScheduled` — an array of all today's scheduled hunts for the app timezone (empty array if none). Both fields are present whether `success` is true or false. Always returns top-level `mqtt` (never null): for a started hunt it uses that hunt's topics; when only scheduled hunts exist it uses the first item; when no hunt exists it returns wildcard subscribe topics (`hunts/+/started`, `hunts/+/ended`) so the app can listen before any hunt is created. Requires `deviceId` and `fcmToken` query params.",
        operationId: "getActiveHunt",
        parameters: [
          {
            name: "deviceId",
            in: "query",
            required: true,
            schema: {
              type: "string",
              minLength: 8,
              maxLength: 128,
            },
            description: "Device identifier to pre-save in participant_devices before join.",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          },
          {
            name: "fcmToken",
            in: "query",
            required: true,
            schema: {
              type: "string",
              maxLength: 512,
            },
            description: "Firebase Cloud Messaging token paired with the deviceId in participant_devices.",
            example: "fcm-player-device-token-abc123xyz",
          },
        ],
        responses: {
          "200": {
            description: "Active hunt or no hunt available",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ActiveHuntResponse" },
                examples: {
                  activeHunt: {
                    summary: "Active hunt found",
                    value: {
                      success: true,
                      data: {
                        id: "clxyz123",
                        huntName: "Summer Scavenger Hunt",
                        location: "Central Park",
                        latitude: 40.785091,
                        longitude: -73.968285,
                        huntDate: "2026-07-15",
                        huntTime: "14:30",
                        huntCode: "HUNT2026",
                        playerClue: "Find the statue near the fountain.",
                        playerNearbyRadiusFt: 100,
                        status: "started",
                        proximityAlerts: [
                          {
                            id: "clalert1",
                            distanceFt: 150,
                            message: "Getting Closer",
                            messageColor: "#000000",
                          },
                          {
                            id: "clalert2",
                            distanceFt: 75,
                            message: "Getting Warmer",
                            messageColor: "#ffa200",
                          },
                        ],
                      },
                      mqtt: {
                        brokerUrl: "mqtt://192.168.18.92:1883",
                        wsUrl: "ws://192.168.18.92:8083/mqtt",
                        clientId: "player-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        username: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        password: null,
                        topics: {
                          live: "hunts/clxyz123/live",
                          start: "hunts/clxyz123/started",
                          end: "hunts/clxyz123/ended",
                          location: "hunts/clxyz123/players/a1b2c3d4-e5f6-7890-abcd-ef1234567890/location",
                        },
                        locationIntervalSec: 5,
                      },
                      todayScheduled: [],
                    },
                  },
                  activeHuntWithDevicePrefetch: {
                    summary: "Active hunt found with device pre-saved",
                    value: {
                      success: true,
                      data: {
                        id: "clxyz123",
                        huntName: "Summer Scavenger Hunt",
                        location: "Central Park",
                        latitude: 40.785091,
                        longitude: -73.968285,
                        huntDate: "2026-07-15",
                        huntTime: "14:30",
                        huntCode: "HUNT2026",
                        playerClue: "Find the statue near the fountain.",
                        playerNearbyRadiusFt: 100,
                        status: "started",
                        proximityAlerts: [
                          {
                            id: "clalert1",
                            distanceFt: 150,
                            message: "Getting Closer",
                            messageColor: "#000000",
                          },
                        ],
                      },
                      mqtt: {
                        brokerUrl: "mqtt://192.168.18.92:1883",
                        wsUrl: "ws://192.168.18.92:8083/mqtt",
                        clientId: "player-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        username: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        password: null,
                        topics: {
                          live: "hunts/clxyz123/live",
                          start: "hunts/clxyz123/started",
                          end: "hunts/clxyz123/ended",
                          location: "hunts/clxyz123/players/a1b2c3d4-e5f6-7890-abcd-ef1234567890/location",
                        },
                        locationIntervalSec: 5,
                      },
                      todayScheduled: [],
                    },
                  },
                  noActiveHunt: {
                    summary: "No active hunt",
                    value: {
                      success: false,
                      message:
                        "There is no currently active hunt. Check after some time for available hunts.",
                      mqtt: {
                        brokerUrl: "mqtt://192.168.18.92:1883",
                        wsUrl: "ws://192.168.18.92:8083/mqtt",
                        clientId: "player-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        username: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        password: null,
                        topics: {
                          live: "hunts/clsched456/live",
                          start: "hunts/clsched456/started",
                          end: "hunts/clsched456/ended",
                          location:
                            "hunts/clsched456/players/a1b2c3d4-e5f6-7890-abcd-ef1234567890/location",
                        },
                        locationIntervalSec: 5,
                      },
                      todayScheduled: [
                        {
                          id: "clsched456",
                          huntName: "Evening Scavenger Hunt",
                          location: "Central Park",
                          latitude: 40.785091,
                          longitude: -73.968285,
                          huntDate: "2026-07-10",
                          huntTime: "18:00",
                          huntCode: "HUNT2026B",
                          playerClue: "Meet at the main gate.",
                          playerNearbyRadiusFt: 100,
                          status: "scheduled",
                          proximityAlerts: [],
                          mqtt: {
                            brokerUrl: "mqtt://192.168.18.92:1883",
                            wsUrl: "ws://192.168.18.92:8083/mqtt",
                            clientId: "player-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            username: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            password: null,
                            topics: {
                              live: "hunts/clsched456/live",
                              start: "hunts/clsched456/started",
                              end: "hunts/clsched456/ended",
                              location:
                                "hunts/clsched456/players/a1b2c3d4-e5f6-7890-abcd-ef1234567890/location",
                            },
                            locationIntervalSec: 5,
                          },
                        },
                        {
                          id: "clsched789",
                          huntName: "Night Scavenger Hunt",
                          location: "Riverside Park",
                          latitude: 40.795091,
                          longitude: -73.958285,
                          huntDate: "2026-07-10",
                          huntTime: "21:00",
                          huntCode: "HUNT2026C",
                          playerClue: "Start from the bridge.",
                          playerNearbyRadiusFt: 120,
                          status: "scheduled",
                          proximityAlerts: [],
                          mqtt: {
                            brokerUrl: "mqtt://192.168.18.92:1883",
                            wsUrl: "ws://192.168.18.92:8083/mqtt",
                            clientId: "player-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            username: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            password: null,
                            topics: {
                              live: "hunts/clsched789/live",
                              start: "hunts/clsched789/started",
                              end: "hunts/clsched789/ended",
                              location:
                                "hunts/clsched789/players/a1b2c3d4-e5f6-7890-abcd-ef1234567890/location",
                            },
                            locationIntervalSec: 5,
                          },
                        },
                      ],
                    },
                  },
                  noHuntIdleListener: {
                    summary: "No hunt at all — wildcard MQTT for start/end",
                    value: {
                      success: false,
                      message:
                        "There is no currently active hunt. Check after some time for available hunts.",
                      mqtt: {
                        brokerUrl: "mqtt://192.168.18.92:1883",
                        wsUrl: "ws://192.168.18.92:8083/mqtt",
                        clientId: "player-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        username: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        password: null,
                        topics: {
                          live: "hunts/+/live",
                          start: "hunts/+/started",
                          end: "hunts/+/ended",
                          location: null,
                        },
                        locationIntervalSec: 3,
                      },
                      todayScheduled: [],
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/join": {
      post: {
        tags: ["Hunts"],
        summary: "Join active hunt (Start Playing)",
        description:
          "Registers the device as a participant in the currently started hunt. Only hunts with status `started` can be joined. A unique auto-generated username (e.g. Hunter-001) is assigned on first join. If the same device already joined this hunt, the existing participant is returned. Send the same `deviceId` and `fcmToken` that were already sent to `GET /api/hunts/active`; if a matching row exists in `participant_devices`, its `participantId` is linked after the participant is created/found. The response includes MQTT connection details for live `totalJoined`, `scanCount`, and `nearbyCount` updates.",
        operationId: "joinActiveHunt",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/JoinHuntRequest" },
              example: {
                deviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                fcmToken: "fcm-player-device-token-abc123xyz",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Device already joined this hunt, or no active hunt available",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/JoinHuntSuccessResponse" },
                    { $ref: "#/components/schemas/JoinHuntUnavailableResponse" },
                  ],
                },
              },
            },
          },
          "201": {
            description: "New participant created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JoinHuntSuccessResponse" },
                example: {
                  success: true,
                  data: {
                    participant: {
                      id: "clpart123",
                      username: "Hunter-001",
                      deviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                      huntId: "clxyz123",
                      createdAt: "2026-06-29T12:00:00.000Z",
                      updatedAt: "2026-06-29T12:00:00.000Z",
                    },
                    hunt: {
                      id: "clxyz123",
                      huntName: "Summer Scavenger Hunt",
                      location: "Central Park",
                      latitude: 40.785091,
                      longitude: -73.968285,
                      huntDate: "2026-07-15",
                      huntTime: "14:30",
                      huntCode: "HUNT2026",
                      playerClue: "Find the statue near the fountain.",
                      playerNearbyRadiusFt: 100,
                      status: "started",
                      proximityAlerts: [
                        {
                          id: "clalert1",
                          distanceFt: 150,
                          message: "Getting Closer",
                          messageColor: "#000000",
                        },
                      ],
                    },
                    isNew: true,
                    mqtt: {
                      brokerUrl: "mqtt://192.168.18.92:1883",
                      wsUrl: "ws://192.168.18.92:8083/mqtt",
                      clientId: "player-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                      username: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                      password: null,
                      topics: {
                        live: "hunts/clxyz123/live",
                        start: "hunts/clxyz123/started",
                        end: "hunts/clxyz123/ended",
                        location: "hunts/clxyz123/players/a1b2c3d4-e5f6-7890-abcd-ef1234567890/location",
                      },
                      locationIntervalSec: 3,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Server error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/prize": {
      get: {
        tags: ["Hunts"],
        summary: "Get first-place prize message status",
        description:
          "Returns prize claim status for a device on a hunt. `message` always reflects status in one field: none → wait for admin; waiting → admin text; claimed → prize claimed. Requires `deviceId` and `huntId`.",
        operationId: "getHuntPrizeStatus",
        parameters: [
          {
            name: "deviceId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "huntId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Prize status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    prize: {
                      type: "object",
                      properties: {
                        huntId: { type: "string" },
                        huntName: { type: "string" },
                        isFirstPlace: { type: "boolean" },
                        status: {
                          type: "string",
                          enum: ["none", "waiting", "claimed"],
                        },
                        message: {
                          type: "string",
                          description:
                            "Status-based message shown to the user (always present).",
                          example: "Please wait for admin response for prize collection destination.",
                        },
                        messageSentAt: { type: "string", nullable: true },
                        claimedAt: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "404": {
            description: "Hunt not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/hunts/scan": {
      post: {
        tags: ["Hunts"],
        summary: "Record QR code scan",
        description:
          "Call after the player scans the hunt QR code. The QR encodes only the raw hunt code. Send `deviceId` (from join) and `huntCode` (read from the QR). First scanner gets rank 1, second gets rank 2, and so on. Player must join the hunt before scanning. On each **new** successful scan, admins with saved FCM tokens receive a push (`type: admin_first_place_scan` for rank 1, `admin_qr_scan` for later ranks).",
        operationId: "scanHuntQr",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/QrScanRequest" },
              example: {
                deviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                huntCode: "HUNT2026",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Scan recorded or already scanned",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/QrScanSuccessResponse" },
                    { $ref: "#/components/schemas/QrScanUnavailableResponse" },
                  ],
                },
                example: {
                  success: true,
                  data: {
                    username: "Hunter-001",
                    scanRank: 1,
                    scannedAt: "2026-06-29T12:05:00.000Z",
                    message: "You found the QR code!",
                    isFirstScan: true,
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "500": {
            description: "Server error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/areas": {
      get: {
        tags: ["Hunts"],
        summary: "List active hunt areas",
        operationId: "listHuntAreas",
        responses: {
          "200": {
            description: "Areas available for player selection",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    areas: { type: "array", items: { $ref: "#/components/schemas/HuntArea" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/player/areas": {
      get: {
        tags: ["Hunts"],
        summary: "Get player's selected areas",
        operationId: "getPlayerAreas",
        parameters: [
          { name: "deviceId", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Current selection and available areas",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PlayerAreasResponse" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Hunts"],
        summary: "Replace player's selected areas",
        operationId: "updatePlayerAreas",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PlayerAreasRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Area selection saved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PlayerAreasResponse" },
              },
            },
          },
          "400": {
            description: "Invalid device, token, or areas",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", enum: [false] },
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
      PlayerAreasRequest: {
        type: "object",
        required: ["deviceId", "fcmToken", "areaIds"],
        properties: {
          deviceId: { type: "string", minLength: 8, maxLength: 128 },
          fcmToken: { type: "string", maxLength: 512 },
          areaIds: {
            type: "array",
            minItems: 1,
            maxItems: 20,
            uniqueItems: true,
            items: { type: "string" },
          },
        },
      },
      PlayerAreasResponse: {
        type: "object",
        required: ["success", "areaIds", "areas", "areaSelectionRequired"],
        properties: {
          success: { type: "boolean", enum: [true] },
          areaIds: { type: "array", items: { type: "string" } },
          areas: { type: "array", items: { $ref: "#/components/schemas/HuntArea" } },
          areaSelectionRequired: { type: "boolean" },
        },
      },
      UserProximityAlert: {
        type: "object",
        required: ["id", "distanceFt", "message", "messageColor"],
        properties: {
          id: { type: "string" },
          distanceFt: { type: "number", minimum: 1, description: "Distance (ft)" },
          message: { type: "string" },
          messageColor: { type: "string", example: "#000000" },
        },
      },
      UserActiveHunt: {
        type: "object",
        required: [
          "id",
          "huntName",
          "location",
          "latitude",
          "longitude",
          "huntDate",
          "huntTime",
          "huntCode",
          "playerClue",
          "playerNearbyRadiusFt",
          "status",
          "proximityAlerts",
        ],
        properties: {
          id: { type: "string" },
          area: {
            allOf: [{ $ref: "#/components/schemas/HuntAreaSummary" }],
            nullable: true,
          },
          huntName: { type: "string" },
          location: { type: "string" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          huntDate: { type: "string", format: "date" },
          huntTime: { type: "string", description: "24-hour HH:mm" },
          huntCode: { type: "string" },
          playerClue: { type: "string" },
          playerNearbyRadiusFt: {
            type: "number",
            minimum: 1,
            description: "Player nearby radius in feet (ft)",
          },
          status: {
            type: "string",
            enum: ["started"],
            description: "Only started hunts are returned",
          },
          proximityAlerts: {
            type: "array",
            items: { $ref: "#/components/schemas/UserProximityAlert" },
          },
        },
      },
      UserTodayScheduledHunt: {
        type: "object",
        required: [
          "id",
          "huntName",
          "location",
          "latitude",
          "longitude",
          "huntDate",
          "huntTime",
          "huntCode",
          "playerClue",
          "playerNearbyRadiusFt",
          "status",
          "proximityAlerts",
        ],
        properties: {
          id: { type: "string" },
          area: {
            allOf: [{ $ref: "#/components/schemas/HuntAreaSummary" }],
            nullable: true,
          },
          huntName: { type: "string" },
          location: { type: "string" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          huntDate: { type: "string", format: "date" },
          huntTime: { type: "string", description: "24-hour HH:mm" },
          huntCode: { type: "string" },
          playerClue: { type: "string" },
          playerNearbyRadiusFt: {
            type: "number",
            minimum: 1,
            description: "Player nearby radius in feet (ft)",
          },
          status: {
            type: "string",
            enum: ["scheduled"],
            description: "Today's scheduled hunt only",
          },
          proximityAlerts: {
            type: "array",
            items: { $ref: "#/components/schemas/UserProximityAlert" },
          },
          mqtt: {
            allOf: [{ $ref: "#/components/schemas/HuntMqttConnectionInfo" }],
            nullable: true,
            description:
              "MQTT connection for this scheduled hunt. Connect and subscribe to topics.start before join to receive hunt start events.",
          },
        },
      },
      ActiveHuntSuccessResponse: {
        type: "object",
        required: ["success", "data", "mqtt", "todayScheduled"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/UserActiveHunt" },
          mqtt: {
            allOf: [{ $ref: "#/components/schemas/HuntMqttConnectionInfo" }],
            description:
              "MQTT connection for the started hunt. Use topics.start / topics.live / topics.end without joining first.",
          },
          todayScheduled: {
            type: "array",
            items: { $ref: "#/components/schemas/UserTodayScheduledHunt" },
            description: "All of today's scheduled hunts in app timezone",
          },
        },
      },
      ActiveHuntUnavailableResponse: {
        type: "object",
        required: ["success", "message", "mqtt", "todayScheduled"],
        properties: {
          success: { type: "boolean", enum: [false] },
          message: {
            type: "string",
            example: "There is no currently active hunt. Check after some time for available hunts.",
          },
          mqtt: {
            allOf: [{ $ref: "#/components/schemas/HuntMqttConnectionInfo" }],
            description:
              "Always present. Uses the first todayScheduled hunt when available; otherwise wildcard topics hunts/+/started and hunts/+/ended for idle listening.",
          },
          todayScheduled: {
            type: "array",
            items: { $ref: "#/components/schemas/UserTodayScheduledHunt" },
            description: "All of today's scheduled hunts in app timezone",
          },
        },
      },
      ActiveHuntResponse: {
        oneOf: [
          { $ref: "#/components/schemas/ActiveHuntSuccessResponse" },
          { $ref: "#/components/schemas/ActiveHuntUnavailableResponse" },
        ],
      },
      JoinHuntRequest: {
        type: "object",
        required: ["deviceId", "fcmToken"],
        properties: {
          deviceId: {
            type: "string",
            minLength: 8,
            maxLength: 128,
            description: "Unique device identifier generated and persisted by the mobile app",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          },
          fcmToken: {
            type: "string",
            maxLength: 512,
            description: "Firebase Cloud Messaging device token. Must match the value sent to GET /api/hunts/active.",
            example: "fcm-player-device-token-abc123xyz",
          },
        },
      },
      HuntParticipant: {
        type: "object",
        required: ["id", "username", "deviceId", "huntId", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          username: {
            type: "string",
            description: "Auto-generated unique username",
            example: "Hunter-001",
          },
          deviceId: {
            type: "string",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          },
          huntId: { type: "string", description: "Active hunt ID" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      JoinHuntSuccessResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: {
            type: "object",
            required: ["participant", "hunt", "isNew"],
            properties: {
              participant: { $ref: "#/components/schemas/HuntParticipant" },
              hunt: { $ref: "#/components/schemas/UserActiveHunt" },
              isNew: {
                type: "boolean",
                description: "True when a new participant record was created",
              },
              mqtt: {
                allOf: [{ $ref: "#/components/schemas/HuntMqttConnectionInfo" }],
                nullable: true,
                description: "Present only when the active hunt status is started",
              },
            },
          },
        },
      },
      HuntMqttConnectionInfo: {
        type: "object",
        required: [
          "brokerUrl",
          "wsUrl",
          "clientId",
          "username",
          "topics",
          "locationIntervalSec",
        ],
        properties: {
          brokerUrl: { type: "string", example: "mqtt://192.168.18.92:1883" },
          wsUrl: { type: "string", example: "ws://192.168.18.92:8083/mqtt" },
          clientId: { type: "string" },
          username: { type: "string" },
          password: {
            type: "string",
            nullable: true,
            description: "JWT MQTT password when anonymous broker access is disabled",
          },
          topics: {
            type: "object",
            required: ["live", "start", "end", "location", "prize", "adminMessage", "positions"],
            properties: {
              live: {
                type: "string",
                example: "hunts/clxyz123/live",
                description: "Subscribe for retained live stats payload",
              },
              start: {
                type: "string",
                example: "hunts/clxyz123/started",
                description:
                  "Subscribe for hunt-started event. May be a hunt-specific topic or wildcard hunts/+/started when no hunt is scheduled yet.",
              },
              end: {
                type: "string",
                example: "hunts/clxyz123/ended",
                description:
                  "Subscribe for hunt-ended event. May be a hunt-specific topic or wildcard hunts/+/ended when no hunt is scheduled yet.",
              },
              location: {
                type: "string",
                nullable: true,
                example: "hunts/clxyz123/players/device-id/location",
                description: "Player publish topic for GPS updates every 3 seconds",
              },
              prize: {
                type: "string",
                nullable: true,
                example: "hunts/clxyz123/players/device-id/prize",
                description:
                  "Subscribe for winner-only prize events. Payload `event` is `claim_now` or `claimed`. Only published to this device's topic.",
              },
              adminMessage: {
                type: "string",
                nullable: true,
                example: "hunts/clxyz123/players/device-id/admin_message",
                description:
                  "Subscribe after join for admin broadcast events. Payload `event` is `admin_message`. Only published to joined players on this device topic.",
              },
              positions: {
                type: "string",
                nullable: true,
                description:
                  "Always null for player apps. Admin live-map snapshot topic is not sent to players.",
              },
            },
          },
          locationIntervalSec: { type: "integer", enum: [3], example: 3 },
        },
      },
      HuntLiveStatsPayload: {
        type: "object",
        required: ["totalJoined", "scanCount", "nearbyCount", "updatedAt"],
        properties: {
          totalJoined: { type: "integer", minimum: 0 },
          scanCount: {
            type: "integer",
            minimum: 0,
            description: "Players who have successfully scanned the hunt QR code",
          },
          nearbyCount: {
            type: "integer",
            minimum: 0,
            description: "Players currently within the hunt pin radius",
          },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      JoinHuntUnavailableResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", enum: [false] },
          message: {
            type: "string",
            example: "There is no currently active hunt. Check after some time for available hunts.",
          },
        },
      },
      QrScanRequest: {
        type: "object",
        required: ["deviceId", "huntCode"],
        properties: {
          deviceId: {
            type: "string",
            minLength: 8,
            maxLength: 128,
            description: "Device identifier from join API",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          },
          huntCode: {
            type: "string",
            description: "Event code parsed from scanned QR URL",
            example: "HUNT2026",
          },
        },
      },
      QrScanResult: {
        type: "object",
        required: ["username", "scanRank", "scannedAt", "message", "isFirstScan"],
        properties: {
          username: { type: "string", example: "Hunter-001" },
          scanRank: { type: "integer", minimum: 1, description: "1 = first scanner" },
          scannedAt: { type: "string", format: "date-time" },
          message: {
            type: "string",
            example: "You found the QR code!",
          },
          isFirstScan: {
            type: "boolean",
            description: "False if this device already scanned before",
          },
        },
      },
      QrScanSuccessResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { $ref: "#/components/schemas/QrScanResult" },
        },
      },
      QrScanUnavailableResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string" },
        },
      },
    },
  },
};
