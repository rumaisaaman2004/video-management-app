# Requirements

This page shows how each requirement in the project brief and the reference sheet is met, and where to find it in the code.

## Roles

| Role  | Can do                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Guest | Browse, search and watch public videos. Open public playlists.                                                                        |
| User  | Everything a guest can, plus: like, bookmark, save watch progress, see history, create and share playlists                            |
| Admin | Everything a user can, plus: upload, edit and delete videos, manage thumbnails, see private and unprocessed videos, manage categories |

Registration always creates a `user`. Admins come from the seed data, or are promoted in the database.

## Reference sheet

| Requirement                 | Status                | Implementation                                                                                                                    |
| --------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Video upload and management | Done                  | Admin upload with progress bar, live processing status, edit, delete. `features/admin`, `POST/PATCH/DELETE /api/videos`           |
| Video library with search   | Done                  | Full-text search that matches while you type, across titles, descriptions and tags. `features/videos`, `modules/videos/search.js` |
| Filters and categories      | Done                  | Category and tag filters, 7 sort orders, pagination, all kept in the URL. Categories API.                                         |
| Thumbnails and metadata     | Done                  | Thumbnail made automatically by FFmpeg. Admins can pick a frame or upload an image. Metadata fields are listed below.             |
| Playlists                   | Done                  | Create, edit, delete, add, remove and reorder. Private or public, with a share link. `features/playlists`, `modules/playlists`    |
| Favourites / bookmarks      | Done                  | Bookmark button and a Favourites page. Likes with counts. `modules/engagement`                                                    |
| Watch history and progress  | Done                  | Progress saved while watching, resume where you left off, Continue watching, History page with remove and clear                   |
| Video player (Video.js)     | Done                  | Video.js 8. `features/watch/VideoPlayer.jsx`                                                                                      |
| Playback speed settings     | Done                  | 0.5× to 2×                                                                                                                        |
| Quality settings            | Done                  | 360p / 480p / 720p renditions and a custom quality menu that keeps your place when you switch                                     |
| FFmpeg thumbnail generation | Done                  | `lib/ffmpeg.js`, `modules/videos/videoProcessor.js`                                                                               |
| Testing                     | Done                  | 170 server tests, 133 client tests, 72 Postman checks, axe accessibility audit                                                    |
| Cloud storage (optional)    | Not done, by decision | Media is stored on the local disk. Storage sits behind an interface, so an S3 driver could be added later.                        |
| Deployment (optional)       | Not done, by decision | Demo project, run locally only                                                                                                    |
| Demo video                  | Script ready          | [demo-script.md](demo-script.md)                                                                                                  |

## Project brief

| Requirement            | Implementation                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Responsive frontend    | Bootstrap 5 grid. Collapsible navbar. Video grid goes from 1 to 4 columns. Tables scroll on small screens. Smaller video quality on phones. Light and dark mode.           |
| Reusable UI components | `components/ui`: VideoCard, VideoGrid, DataTable, FormField, AppPagination, ConfirmDialog, Toasts, Empty, Error and Loading states, PageHeader, SearchBox, StatusBadge     |
| Database design        | 12 normalised tables, foreign keys with deliberate delete rules, CHECK constraints, full-text search and indexes for each main query. See [database.md](database.md).      |
| API integration        | REST API with a consistent response and error format. One client-side API client that renews the session automatically. See [api.md](api.md).                              |
| Validation             | Zod on every request (params, query, body), file type checked from the file's bytes, database constraints. Forms show each server error next to its field.                 |
| Testing                | Integration tests against a real database, component tests with MSW, Postman end-to-end checks, coverage reports. See [architecture.md](architecture.md#testing-strategy). |
| Documentation          | README, architecture, database, API, requirements and demo script                                                                                                          |
| Security               | See [architecture.md](architecture.md#security)                                                                                                                            |

## Video metadata

| Field            | Source                         | Notes                                                     |
| ---------------- | ------------------------------ | --------------------------------------------------------- |
| Title            | Admin                          | Required, 1–200 characters, searchable (weighted highest) |
| Description      | Admin                          | Optional, up to 5000 characters, searchable               |
| Category         | Admin                          | Optional, one per video                                   |
| Tags             | Admin                          | Any number, lowercase, searchable and filterable          |
| Visibility       | Admin                          | `public` or `private`                                     |
| Status           | System                         | `processing` → `ready` or `failed`                        |
| Duration         | FFprobe                        | Seconds, shown as `m:ss` or `h:mm:ss`                     |
| Resolution       | FFprobe                        | Width and height of each rendition                        |
| Thumbnail        | FFmpeg, or chosen by the admin | 640 px wide                                               |
| File size, type  | Upload                         | Stored for each asset                                     |
| Views            | Playback                       | Counted when playback starts                              |
| Likes            | Users                          | Count of likes                                            |
| Uploader         | System                         | The admin who uploaded the video                          |
| Created, updated | System                         | Timestamps                                                |

## Quality checks

| Check                          | Result                                                    |
| ------------------------------ | --------------------------------------------------------- |
| `npm test`                     | 170 server and 133 client tests pass                      |
| `npm run test:api`             | 72 of 72 Postman checks pass; the data is left unchanged  |
| `npm run lint`, `format:check` | Clean                                                     |
| `npm audit --omit=dev`         | 0 vulnerabilities                                         |
| Accessibility (axe-core)       | 0 WCAG 2.1 AA violations on 17 pages, light and dark mode |
| Browsers                       | Chrome and Firefox checked                                |
