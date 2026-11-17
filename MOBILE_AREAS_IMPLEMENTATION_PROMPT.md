# Mobile Developer Prompt — Hunt Areas (Admin + User Apps)

Implement the Hunt Areas feature in both existing Flutter apps without removing or changing any current hunt, MQTT, map, push, scan, prize, or authentication behavior.

## Product rules

1. The user app can select one or more admin-defined areas (for example, Oshkosh and Local / Hometown).
2. Every new or edited scheduled hunt must select one area.
3. Users only see active/today-scheduled hunts assigned to one of their selected areas.
4. A separate hunt availability toggle is not required. Admin can disable an area; disabled areas are not available to players.
5. The backend still supports legacy hunts with `area: null` during rollout. Display these normally.
6. Do not hardcode area IDs, names, MQTT URLs, or environment URLs.

## Existing behavior that must remain unchanged

- Admin login/profile and hunt create/edit/start/end
- Player active-hunt, join, scan, prize claim, proximity alerts
- MQTT connect/subscriptions/location publishing
- Live tracking map and joined/nearby counts
- FCM token registration and all existing notifications
- Existing API response/error handling

## User app

### 1. Load areas

Call:

`GET /api/areas`

Response:

```json
{
  "success": true,
  "areas": [
    {
      "id": "area-id",
      "name": "Oshkosh",
      "slug": "oshkosh",
      "isActive": true,
      "sortOrder": 10
    }
  ]
}
```

Show active areas as a multi-select screen, ordered as returned by the API.

### 2. Read current selection

Call:

`GET /api/player/areas?deviceId={deviceId}`

Use:

- `areaIds` as selected values
- `areas` as current available options
- `areaSelectionRequired` to decide whether onboarding must be shown

### 3. Save selection

Call:

`PUT /api/player/areas`

```json
{
  "deviceId": "existing-device-id",
  "fcmToken": "current-fcm-token",
  "areaIds": ["area-id-1", "area-id-2"]
}
```

At least one area is required. Save successfully before opening the normal hunt home screen.

### 4. Active hunt flow

Continue calling the existing:

`GET /api/hunts/active?deviceId={deviceId}&fcmToken={fcmToken}`

The response now also contains:

```json
{
  "areaIds": ["area-id"],
  "areaSelectionRequired": false
}
```

Each hunt contains:

```json
{
  "area": {
    "id": "area-id",
    "name": "Oshkosh",
    "slug": "oshkosh"
  }
}
```

`area` can be `null` only for a legacy hunt. Do not crash or hide a legacy hunt.

### 5. Join flow

Keep the existing join request unchanged. If the user has selected areas but tries to join a hunt outside them, the API returns HTTP `403`:

```json
{
  "success": false,
  "error": "This hunt is not available for your selected areas."
}
```

Show that message and refresh active hunts. Do not attempt MQTT connection after a failed join.

### 6. Settings

Add “Hunt Areas” in user settings. It uses the same GET/PUT player-area APIs. After saving:

- refresh active/today-scheduled hunts;
- disconnect MQTT topics for a hunt that is no longer visible;
- reconnect using only the MQTT object returned by the refreshed API.

FCM area targeting is handled by the backend using saved device subscriptions. The Flutter app must not invent or hardcode FCM topic names.

## Admin app

### 1. Areas management screen

Add an “Areas” screen for authenticated admins.

- `GET /api/admin/areas`
- `POST /api/admin/areas`
- `PUT /api/admin/areas/{id}`
- `DELETE /api/admin/areas/{id}`

Create/update body:

```json
{
  "name": "Oshkosh",
  "slug": "oshkosh",
  "isActive": true,
  "sortOrder": 10
}
```

Rules:

- `slug` may be omitted; backend generates it from the name.
- Prefer disabling an area instead of deleting it.
- An area assigned to hunts returns HTTP `409` on delete.
- Show `huntCount` and `subscriberCount`.

### 2. Hunt create/edit

Load choices from `GET /api/admin/areas`.

Add a required “Area” dropdown to:

- Create hunt
- Edit scheduled hunt

Send the selected ID as:

```json
{
  "areaId": "selected-area-id"
}
```

Preserve every existing request field. Do not send `areaId` when editing a started hunt because started-hunt updates still only accept player clue and nearby radius.

### 3. Hunt list/detail

Read `hunt.area` and display the area name. If it is null, display “Legacy / All areas”.

### 4. Area-targeted broadcast

On the admin Broadcast screen, load active areas and require one area selection before sending:

```http
POST /api/push/broadcast-all
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "areaId": "selected-area-id",
  "message": "Announcement text"
}
```

The backend sends this FCM push only to devices subscribed to that area. The push data payload includes `type: app_broadcast`, `event: app_broadcast`, `message`, and `areaId`.

## Required state handling

- Loading, empty, retry, offline, validation, and API error states
- No duplicate requests when the screen rebuilds
- Persist only IDs locally; refresh labels from API
- Refresh FCM token before saving area selection when possible
- Safe null handling for legacy data

## Acceptance tests

1. Oshkosh-only user sees Oshkosh hunt, not Local hunt.
2. Local-only user sees Local hunt, not Oshkosh hunt.
3. Multi-area user sees both.
4. User can change areas in settings and results refresh immediately.
5. Wrong-area join shows the backend 403 message and does not connect MQTT.
6. Disabled area disappears from player selection and its hunts are hidden.
7. Legacy hunt with `area: null` still opens and works.
8. Admin cannot create/edit a scheduled hunt without selecting an area in the UI.
9. Existing MQTT tracking, live pins, proximity count, scan, prize, start/end and push flows still work.
10. Test on iOS and Android with apps on a network different from the API server.
11. Broadcast sent for Oshkosh reaches Oshkosh subscribers only; Local/Hometown subscribers do not receive it.

Use the Swagger portals for the final request/response contracts:

- Admin: `/admin/api-docs`
- User: `/user/api-docs`

