# API reference

The base URL is `http://localhost:4000/api`. In development the React app calls `/api` on its own origin, and Vite forwards the requests here.

Every endpoint below is also in the Postman collection ([`postman/`](../postman)). Run the collection with `npm run test:api`.

## Conventions

### Responses

A single resource comes back in `data`. A list adds `meta` for pagination:

```json
{
  "data": [{ "id": "…", "title": "Introduction to HTML" }],
  "meta": { "page": 1, "pageSize": 12, "total": 9, "totalPages": 1 }
}
```

Lists accept `page` (default `1`) and `pageSize` (default `12`, maximum `50`).

### Errors

Every error has the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "field": "body.title", "message": "Title is required" }]
  }
}
```

| Status | `code`                | When                                                                                    |
| ------ | --------------------- | --------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Params, query or body failed validation. `details` lists every field.                   |
| 400    | `BAD_REQUEST`         | Malformed JSON, or a value the database rejected                                        |
| 401    | `UNAUTHORIZED`        | No access token, or it is invalid or expired                                            |
| 403    | `FORBIDDEN`           | Signed in, but not allowed (e.g. not an admin, not the playlist owner)                  |
| 404    | `NOT_FOUND`           | Doesn't exist, or the caller can't see it                                               |
| 409    | `CONFLICT`            | Duplicate (e.g. email already registered), or the video isn't ready                     |
| 413    | `PAYLOAD_TOO_LARGE`   | File or body over the size limit                                                        |
| 429    | (rate limiter)        | Too many requests                                                                       |
| 500    | `INTERNAL_ERROR`      | Unexpected error. The response includes a `requestId` to match against the server logs. |
| 503    | `SERVICE_UNAVAILABLE` | Database unreachable (health check)                                                     |

Videos, playlists and other resources the caller isn't allowed to see return **404, not 403**, so their existence isn't revealed. Error messages never include table names, SQL or stack traces.

Every response has an `X-Request-Id` header, which also appears in the server logs.

### Authentication

1. `POST /auth/login` (or `/auth/register`) returns an **access token** in the body. It also sets a **refresh token** in an `httpOnly`, `SameSite=Strict` cookie, limited to `/api/auth`.
2. Send the access token with each request: `Authorization: Bearer <accessToken>`. It expires after 15 minutes.
3. When it expires, call `POST /auth/refresh`. The cookie is sent automatically, and the response holds a new access token and a new cookie.

Refresh tokens are single-use. If a used token is presented again after a 30-second grace period, the whole session is revoked, because the token was probably stolen. The React app keeps the access token in memory only, never in `localStorage`.

**Access levels in the tables below**

| Level    | Who can call                                           |
| -------- | ------------------------------------------------------ |
| Public   | Anyone, no token needed                                |
| Optional | Anyone; a token adds personal data or admin visibility |
| User     | Any signed-in user                                     |
| Admin    | Signed-in admins only                                  |

## Health

| Method | Path      | Access | Description                                                |
| ------ | --------- | ------ | ---------------------------------------------------------- |
| GET    | `/health` | Public | `{ "data": { "status": "ok", "database": "up" } }`, or 503 |

## Auth

| Method | Path             | Access | Description                                                       |
| ------ | ---------------- | ------ | ----------------------------------------------------------------- |
| POST   | `/auth/register` | Public | Creates a `user` account and signs in. **201**. Rate-limited.     |
| POST   | `/auth/login`    | Public | Signs in. Rate-limited: 10 attempts per IP per 15 minutes.        |
| POST   | `/auth/refresh`  | Cookie | Swaps the refresh cookie for a new access token and a new cookie. |
| POST   | `/auth/logout`   | Cookie | Ends the session and clears the cookie. **204**.                  |
| GET    | `/auth/me`       | User   | The current user                                                  |

**Register:** `name` (1–100 characters), `email`, `password` (8–72 bytes). Any other field, such as `role`, is ignored, so nobody can register as an admin.

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "Password123!" }
```

```json
{
  "data": {
    "user": {
      "id": "3c0e…",
      "name": "Demo User",
      "email": "user@example.com",
      "role": "user",
      "createdAt": "2026-10-20T09:12:44.120Z",
      "updatedAt": "2026-10-20T09:12:44.120Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs…"
  }
}
```

A wrong email and a wrong password return the same 401, so the response doesn't reveal which emails are registered.

## Categories

| Method | Path              | Access | Description                                                                               |
| ------ | ----------------- | ------ | ----------------------------------------------------------------------------------------- |
| GET    | `/categories`     | Public | All categories, each with `videoCount` (public, ready videos)                             |
| GET    | `/categories/:id` | Public | One category                                                                              |
| POST   | `/categories`     | Admin  | `{ name, slug?, description? }`. **201**. If `slug` is omitted, it is made from the name. |
| PATCH  | `/categories/:id` | Admin  | Any of `name`, `slug`, `description`                                                      |
| DELETE | `/categories/:id` | Admin  | **204**. Its videos become uncategorised.                                                 |

Duplicate names or slugs return 409.

## Videos

### Library and playback

| Method | Path                            | Access   | Description                                                     |
| ------ | ------------------------------- | -------- | --------------------------------------------------------------- |
| GET    | `/videos`                       | Optional | Search and filter the library (paginated)                       |
| GET    | `/videos/:id`                   | Optional | Video details, with renditions                                  |
| GET    | `/videos/:id/renditions/:label` | Optional | Streams one quality (`360p`, `480p`, `720p`). Supports `Range`. |
| GET    | `/videos/:id/thumbnail`         | Optional | The thumbnail image (JPEG)                                      |
| POST   | `/videos/:id/views`             | Public   | Adds one view. **204**. Limited to 60 per minute per IP.        |

**`GET /videos` query parameters**

| Param              | Values                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `q`                | Free text, up to 200 characters. Matches titles, descriptions and tags, with prefix matching (`reac hoo` finds "React Hooks").  |
| `category`         | Category slug, e.g. `web-development`                                                                                           |
| `tag`              | Tag name, e.g. `beginner`                                                                                                       |
| `sort`             | `relevance` (default when `q` is set), `newest` (default otherwise), `oldest`, `popular`, `least-viewed`, `title`, `title-desc` |
| `page`, `pageSize` | Pagination                                                                                                                      |
| `status`           | Admins only: `processing`, `ready` or `failed`                                                                                  |
| `visibility`       | Admins only: `public` or `private`                                                                                              |

Everyone except admins sees only videos that are `ready` and `public`. Admins see all videos.

**Video object**

```json
{
  "id": "8d2b…",
  "title": "Introduction to HTML",
  "description": "Elements, attributes and the structure of a web page.",
  "status": "ready",
  "visibility": "public",
  "durationSeconds": 60,
  "viewCount": 42,
  "likeCount": 3,
  "tags": ["beginner", "html"],
  "category": { "id": "…", "name": "Web Development", "slug": "web-development" },
  "uploader": { "id": "…", "name": "Demo Admin" },
  "thumbnailUrl": "/api/videos/8d2b…/thumbnail?v=1761123456789",
  "createdAt": "2026-10-20T09:15:02.511Z",
  "updatedAt": "2026-10-20T09:15:09.004Z",
  "viewer": { "liked": false, "bookmarked": true, "progressSeconds": 25, "completed": false },
  "renditions": [
    { "label": "360p", "width": 640, "height": 360, "url": "/api/videos/8d2b…/renditions/360p" },
    { "label": "480p", "width": 854, "height": 480, "url": "/api/videos/8d2b…/renditions/480p" },
    { "label": "720p", "width": 1280, "height": 720, "url": "/api/videos/8d2b…/renditions/720p" }
  ]
}
```

- `viewer` is present only for signed-in callers.
- `renditions` is present only on `GET /videos/:id`.

**Media URLs**

- Public, ready videos get plain URLs that browsers can cache.
- Private or unprocessed videos (which only admins can see) get **signed URLs** that expire after one hour: `…/renditions/720p?expires=…&signature=…`. A `<video>` or `<img>` tag can't send an `Authorization` header, so the signature grants access instead. Signatures are removed from the server logs.

### Management (admin)

| Method | Path                          | Access | Description                                                         |
| ------ | ----------------------------- | ------ | ------------------------------------------------------------------- |
| POST   | `/videos`                     | Admin  | Upload (multipart). **202**: stored and queued for processing.      |
| PATCH  | `/videos/:id`                 | Admin  | Edit metadata                                                       |
| DELETE | `/videos/:id`                 | Admin  | Deletes the video, its files and all related data. **204**.         |
| PUT    | `/videos/:id/thumbnail`       | Admin  | Replaces the thumbnail with an uploaded image (multipart `file`)    |
| POST   | `/videos/:id/thumbnail/frame` | Admin  | Uses a frame of the video as the thumbnail: `{ "atSeconds": 12.5 }` |

**Upload** (`multipart/form-data`)

| Field         | Required | Notes                                                                  |
| ------------- | -------- | ---------------------------------------------------------------------- |
| `file`        | yes      | MP4, MOV, WebM or MKV. Up to `MAX_UPLOAD_SIZE_MB` (500 MB by default). |
| `title`       | yes      | 1–200 characters                                                       |
| `description` | no       | Up to 5000 characters                                                  |
| `categoryId`  | no       | An existing category ID                                                |
| `visibility`  | no       | `public` (default) or `private`                                        |
| `tags`        | no       | Comma-separated, e.g. `react,beginner`. Unknown tags are created.      |

```bash
curl -X POST http://localhost:4000/api/videos \
  -H "Authorization: Bearer $TOKEN" \
  -F file=@lecture.mp4 -F title="React Hooks" -F tags="react,intermediate"
```

The response is the new video with `"status": "processing"`. Poll `GET /videos/:id` until it is `ready` or `failed`. The admin pages do this automatically.

The file type is checked from the file's contents (magic bytes), not its name or declared type. A renamed text file is rejected with 400.

**Edit:** any of `title`, `description`, `categoryId` (`null` removes it), `visibility`, `tags` (an array; it replaces all tags, and `[]` removes them).

**Thumbnails:** images can be JPEG, PNG or WebP, up to 5 MB. Every thumbnail is resized to 640 px wide. Picking a frame from a video that isn't ready returns 409.

## Tags

| Method | Path    | Access | Description                      |
| ------ | ------- | ------ | -------------------------------- |
| GET    | `/tags` | Public | All tags, each with `videoCount` |

## Likes, favourites, progress and history

All of these require a signed-in user.

| Method | Path                   | Description                                                                                                             |
| ------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| PUT    | `/videos/:id/like`     | Likes the video → `{ "liked": true, "likeCount": 4 }`                                                                   |
| DELETE | `/videos/:id/like`     | Removes the like → `{ "liked": false, "likeCount": 3 }`                                                                 |
| PUT    | `/videos/:id/bookmark` | Adds the video to favourites → `{ "bookmarked": true }`                                                                 |
| DELETE | `/videos/:id/bookmark` | Removes it from favourites → `{ "bookmarked": false }`                                                                  |
| PUT    | `/videos/:id/progress` | `{ "positionSeconds": 125 }` → `{ "progressSeconds": 125, "completed": false }`                                         |
| GET    | `/me/bookmarks`        | Favourite videos, newest first (paginated)                                                                              |
| GET    | `/me/history`          | Watched videos, most recent first (paginated). `?inProgress=true` returns only unfinished videos ("Continue watching"). |
| DELETE | `/me/history/:id`      | Removes one video from history. **204**.                                                                                |
| DELETE | `/me/history`          | Clears all history. **204**.                                                                                            |

- `PUT` and `DELETE` are idempotent: liking twice still counts as one like.
- The saved position is capped at the video's length.
- A video is marked `completed` at 95% watched, and stays completed after that.

## Playlists

| Method | Path                             | Access   | Description                                                                 |
| ------ | -------------------------------- | -------- | --------------------------------------------------------------------------- |
| GET    | `/me/playlists`                  | User     | My playlists, most recently updated first                                   |
| POST   | `/playlists`                     | User     | `{ title, description?, visibility? }`. Private by default. **201**.        |
| GET    | `/playlists/:id`                 | Optional | A playlist with its videos. Private playlists: owner only (others get 404). |
| PATCH  | `/playlists/:id`                 | Owner    | Any of `title`, `description`, `visibility`                                 |
| DELETE | `/playlists/:id`                 | Owner    | **204**                                                                     |
| POST   | `/playlists/:id/videos`          | Owner    | `{ "videoId": "…" }`. Adds it to the end. 409 if already in the playlist.   |
| PUT    | `/playlists/:id/videos/order`    | Owner    | `{ "videoIds": [ … ] }`. Must list every video exactly once.                |
| DELETE | `/playlists/:id/videos/:videoId` | Owner    | Removes a video; the remaining positions close up                           |

```json
{
  "data": {
    "id": "b71f…",
    "title": "Frontend basics",
    "description": null,
    "visibility": "public",
    "owner": { "id": "…", "name": "Demo User" },
    "videoCount": 2,
    "coverThumbnailUrl": "/api/videos/8d2b…/thumbnail?v=1761123456789",
    "videos": [{ "id": "8d2b…", "title": "Introduction to HTML", "…": "video object" }],
    "createdAt": "…",
    "updatedAt": "…"
  }
}
```

- Someone who is not the owner gets 403 when trying to change a public playlist.
- A playlist can hold up to 200 videos.
- Videos that later become private are hidden from viewers who can't watch them, but stay in the playlist.
