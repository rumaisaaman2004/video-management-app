# Demo video script

A walkthrough of about 8–10 minutes that shows every feature in the brief.

## Before recording

1. Reset the data, then add the demo videos:
   ```bash
   npm run db:reset --workspace=server
   npm run seed:media --workspace=server
   ```
2. Start the app with `npm run dev`, then open <http://localhost:5173>.
3. Have a short MP4 ready to upload. `postman/fixtures/sample.mp4` works, but a real lecture clip of about 30 seconds looks better.
4. Use a browser window around 1280 px wide. Clear any saved quality choice (`localStorage`).

Demo accounts: `admin@example.com` and `user@example.com`. The password for both is `Password123!`.

## Scenes

### 1. Introduction (30 s)

- State the project in one line: a video management app for educational content, built with React, Express and PostgreSQL.
- Explain the two roles: admins manage content; users watch and interact.

### 2. Library as a guest (1 min)

- Show the home page, with its grid of thumbnails, durations, view counts and categories.
- Type `java` slowly in the search box. Results update while you type (prefix match).
- Filter by the **Web Development** category, then by a tag. Change the sort to **Most viewed**.
- Point out that the URL has changed. Copy it into a new tab: the same results appear.

### 3. Register and log in (30 s)

- Click **Register** and submit an empty form to show the validation messages.
- Log in as `user@example.com` instead.

### 4. Watching (1.5 min)

- Open a video. Show the title, description, tags, uploader and views.
- Play it. Change the speed to 1.5×, then change the quality from 720p to 360p. The position doesn't change.
- Click **Like** (the count goes up) and **Bookmark**.
- Watch about 20 seconds, then go back to the home page. **Continue watching** shows the video with a progress bar.
- Open it again. The player says "Continuing from 0:20", and playback starts there.
- Show the **Up next** list.

### 5. Favourites and history (45 s)

- Open **Favourites**: the bookmarked video is there.
- Open **History**: it shows progress for each video. Remove one entry, then show **Clear history** and its confirmation dialog.

### 6. Playlists (1.5 min)

- From a watch page, click **Save to playlist**, then **Create** a playlist called "Frontend basics".
- Add two more videos from their watch pages.
- Open **Playlists** and the new playlist. Reorder the videos with the up and down buttons, then remove one.
- Make the playlist **Public**, then copy the share link.
- Log out and open the link: a guest can view it. A private playlist shows "not found" instead.

### 7. Admin: upload and processing (2 min)

- Log in as `admin@example.com` and open **Manage videos**.
- Show the table with status and visibility filters.
- Click **Upload**:
  - Try a non-video file to show that it is rejected.
  - Choose the MP4 file. Fill in a title, description, category and tags (`react, beginner`), and make it **Private**.
  - Upload it. Show the progress bar, then the **Processing** status changing to **Ready** without reloading the page.
- Briefly explain what happened in the background: FFprobe read the metadata, and FFmpeg made the thumbnail and the 360p, 480p and 720p versions.

### 8. Admin: editing (1 min)

- Edit the uploaded video: change the title and tags, and switch it to **Public**. It now appears in the library.
- In the thumbnail editor:
  - Pick a frame at a chosen second.
  - Then upload an image instead.
- Delete a video. Show the confirmation dialog, and that the video is gone from the library.

### 9. Responsive design and dark mode (30 s)

- Toggle dark mode.
- Narrow the window to phone width (or use DevTools device mode). The navbar collapses, the grid becomes one column, and the admin table scrolls sideways.

### 10. Quality (1 min)

- In a terminal, run `npm test`: 170 server and 133 client tests pass.
- Run `npm run test:api`: 72 Postman checks pass.
- Mention the axe accessibility audit (WCAG 2.1 AA) and that the API rejects bad input.
- Show the `docs/` folder and the database diagram in `docs/database.md`.

### 11. Close (15 s)

- Summarise the features covered.
- Name the optional items left out on purpose: cloud storage and deployment. Mention that the storage interface lets cloud storage be added later.
