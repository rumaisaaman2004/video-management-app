# Video Management App

A responsive web application for uploading, organizing and watching educational videos.

- **Admins** upload videos and manage the library: metadata, categories, tags, thumbnails and visibility.
- **Users** browse and search the library, watch videos with speed and quality controls, like and bookmark videos, build playlists, and resume playback where they left off.

Everything runs locally. Media is stored on the local disk and processed with FFmpeg.

## Features

| Area             | What it does                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Upload           | Admin upload with progress bar. Files are checked by content (MP4, MOV, WebM, MKV), up to 500 MB by default.                       |
| Processing       | Runs in the background. FFprobe reads the metadata; FFmpeg makes a thumbnail and 360p / 480p / 720p renditions (never upscaled).   |
| Library          | Full-text search that matches while you type, category and tag filters, 7 sort orders, pagination. Filters are kept in the URL.    |
| Metadata         | Title, description, category, tags, visibility, duration, views, likes, uploader and dates.                                        |
| Thumbnails       | Generated automatically. Admins can pick a frame from the video or upload an image.                                                |
| Player           | Video.js with playback speed (0.5×–2×) and a quality menu. Resumes from the saved position. Remembers the chosen quality.          |
| Watch progress   | Saved every 10 seconds, and on pause or leaving the page. "Continue watching" on the home page. A video counts as finished at 95%. |
| Favourites       | Bookmark videos and like them (like count shown).                                                                                  |
| Watch history    | List of watched videos with progress. Remove one entry or clear all of them.                                                       |
| Playlists        | Create, rename, reorder, add and remove videos. Private or public. Public playlists can be shared by link.                         |
| Admin management | Table of all videos with status and visibility filters. Edit, delete and change thumbnails. Processing status updates live.        |
| Accounts         | Register, log in and log out. Short-lived access token, plus a rotating refresh token in an httpOnly cookie.                       |
| UI               | Responsive Bootstrap 5 layout, light and dark mode. Tested against WCAG 2.1 AA with axe-core.                                      |

## Tech stack

| Layer    | Technology                                                                          |
| -------- | ----------------------------------------------------------------------------------- |
| Frontend | React 19, Vite 8, React Router 8, Bootstrap 5.3 + React-Bootstrap, Sass, Video.js 8 |
| Backend  | Node.js 22, Express 5, Zod, Multer, Pino, Helmet, JSON Web Tokens, bcrypt           |
| Database | PostgreSQL 16 (`pg` driver, plain SQL migrations)                                   |
| Media    | FFmpeg / FFprobe                                                                    |
| Testing  | Vitest, React Testing Library, MSW, Supertest, Postman + Newman                     |
| Tooling  | npm workspaces, ESLint, Prettier, EditorConfig                                      |

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- PostgreSQL 16, running locally
- FFmpeg 6+ (`ffmpeg` and `ffprobe` on your `PATH`)

On macOS with Homebrew:

```bash
brew install node@22 postgresql@16 ffmpeg
brew services start postgresql@16
```

## Getting started

```bash
# 1. Install dependencies (client and server)
npm install

# 2. Create the databases
createdb video_management_app
createdb video_management_app_test

# 3. Configure the server
cp server/.env.example server/.env
#    Edit server/.env: set DATABASE_URL, and set JWT_SECRET to the output of: openssl rand -hex 32

# 4. Create the tables and the demo data
npm run db:migrate --workspace=server
npm run db:seed --workspace=server
npm run seed:media --workspace=server   # optional: 8 generated demo videos

# 5. Start the API (port 4000) and the React app (port 5173)
npm run dev
```

Open <http://localhost:5173>. The Vite dev server forwards `/api` requests to the API.

At startup the server checks the database, migrations, `ffmpeg` and `ffprobe`. It logs a clear warning if one is missing.

### Demo accounts

Created by `db:seed`, for local development only. The seed script refuses to run in production.

| Role  | Email               | Password       |
| ----- | ------------------- | -------------- |
| Admin | `admin@example.com` | `Password123!` |
| User  | `user@example.com`  | `Password123!` |

### Test database

Tests use their own database, so they never touch your development data. Create `server/.env.test`:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/video_management_app_test
```

The test database name must end in `_test`. Tests apply the migrations themselves.

## Configuration

All settings are environment variables in `server/.env`. This file is git-ignored; `server/.env.example` documents each variable. They are validated at startup, and the server will not start with an invalid or missing value.

| Variable                       | Default                 | Purpose                                             |
| ------------------------------ | ----------------------- | --------------------------------------------------- |
| `NODE_ENV`                     | (required)              | `development`, `test` or `production`               |
| `PORT`                         | `4000`                  | API port                                            |
| `DATABASE_URL`                 | (required)              | PostgreSQL connection string                        |
| `DATABASE_POOL_MAX`            | `10`                    | Maximum database connections                        |
| `CORS_ORIGIN`                  | `http://localhost:5173` | Browser origin allowed to call the API              |
| `LOG_LEVEL`                    | depends on `NODE_ENV`   | `silent`, `error`, `warn`, `info` or `debug`        |
| `TRUST_PROXY`                  | `0`                     | Number of reverse proxies in front of the API       |
| `JWT_SECRET`                   | (required)              | At least 32 characters; signs tokens and media URLs |
| `JWT_ACCESS_TOKEN_TTL`         | `15m`                   | Access token lifetime                               |
| `REFRESH_TOKEN_TTL_DAYS`       | `7`                     | Session lifetime                                    |
| `BCRYPT_ROUNDS`                | `12`                    | Password hashing cost                               |
| `AUTH_RATE_LIMIT_MAX`          | `10`                    | Login/register attempts per IP per 15 minutes       |
| `STORAGE_DIR`                  | `uploads`               | Media folder, relative to `server/`                 |
| `MAX_UPLOAD_SIZE_MB`           | `500`                   | Largest video upload                                |
| `VIDEO_PROCESSING_CONCURRENCY` | `1`                     | Videos processed at the same time (1–8)             |
| `FFMPEG_PATH` / `FFPROBE_PATH` | `ffmpeg` / `ffprobe`    | Paths to the FFmpeg binaries                        |

## Scripts

Run these from the repository root.

| Command                 | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev`           | Starts the API and the React app with live reload             |
| `npm test`              | Runs the server and client test suites                        |
| `npm run test:coverage` | Runs the tests and reports coverage                           |
| `npm run test:api`      | Runs the Postman collection with Newman (API must be running) |
| `npm run lint`          | Runs ESLint on both workspaces                                |
| `npm run format`        | Formats the code with Prettier (`format:check` only checks)   |

Database scripts (add `--workspace=server`):

| Command              | What it does                                                        |
| -------------------- | ------------------------------------------------------------------- |
| `npm run db:migrate` | Applies new migrations                                              |
| `npm run db:seed`    | Adds categories, tags and demo accounts                             |
| `npm run db:reset`   | Drops all tables, then migrates and seeds again (not in production) |
| `npm run seed:media` | Generates 8 demo videos through the real upload pipeline            |

## Testing

| Suite           | Tool                           | Covers                                                                             |
| --------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| Server (170)    | Vitest + Supertest             | Every endpoint against a real PostgreSQL test database, plus FFmpeg processing     |
| Client (133)    | Vitest + Testing Library + MSW | Pages, forms, guards, player logic and API client                                  |
| API (72 checks) | Postman + Newman               | End-to-end flow: auth, upload, processing, library, engagement, playlists, cleanup |

Coverage is about 90% of statements on the server and 86% on the client. The Postman run cleans up after itself. To run it, start the API (`npm run dev`), then run `npm run test:api`. You can also import `postman/` into Postman.

## Project structure

```text
video-management-app/
├── client/                 React app (Vite)
│   └── src/
│       ├── app/            Router and app shell
│       ├── components/     Layout and reusable UI components
│       ├── features/       auth, videos (library), watch, me, playlists, admin
│       ├── hooks/          Shared hooks (data loading, URL state, debounce…)
│       ├── lib/            API client and helpers
│       └── styles/         Bootstrap theme (Sass)
├── server/                 Express API
│   ├── db/                 SQL migrations and seeds
│   ├── scripts/            Database and demo media scripts
│   ├── src/
│   │   ├── modules/        auth, categories, videos, tags, engagement, playlists, health
│   │   ├── middleware/     Validation, uploads, rate limits, errors, logging
│   │   ├── lib/            FFmpeg, storage, signed URLs, logger
│   │   └── db/             Pool, migrator, transactions
│   └── tests/
├── postman/                API collection, environment and sample video
└── docs/                   Project documentation
```

## Documentation

- [Architecture](docs/architecture.md): how the system is built, the video pipeline, security and testing
- [Database](docs/database.md): schema diagram, tables, constraints and migrations
- [API reference](docs/api.md): every endpoint with request and response examples
- [Requirements](docs/requirements.md): how each requirement in the brief is met
- [Demo script](docs/demo-script.md): walkthrough for recording the demo video
