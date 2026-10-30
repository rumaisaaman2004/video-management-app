# Video Management App

A responsive web application for uploading, organizing, and watching educational videos.
Users can browse a searchable video library, build playlists, like and bookmark videos,
and resume playback where they left off.

## Tech Stack

| Layer    | Technology                                                  |
| -------- | ----------------------------------------------------------- |
| Frontend | React 19 (Vite), React Router, CSS3 (CSS Modules), Video.js |
| Backend  | Node.js, Express 5, Multer, Zod                             |
| Database | PostgreSQL 16 (`pg` driver, plain SQL migrations)           |
| Media    | FFmpeg / FFprobe (thumbnails and metadata)                  |
| Testing  | Vitest, React Testing Library, Supertest, Postman           |

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (running locally)
- FFmpeg 6+ (`ffmpeg` and `ffprobe` on PATH)
