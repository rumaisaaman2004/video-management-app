-- Composite primary keys make each interaction unique per user and video.

CREATE TABLE likes (
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  video_id   uuid NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

-- Counts likes per video.
CREATE INDEX likes_video_id_idx ON likes (video_id);

CREATE TABLE bookmarks (
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  video_id   uuid NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE INDEX bookmarks_user_created_idx ON bookmarks (user_id, created_at DESC);

CREATE TABLE watch_history (
  user_id          uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  video_id         uuid NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
  progress_seconds integer NOT NULL DEFAULT 0 CHECK (progress_seconds >= 0),
  completed        boolean NOT NULL DEFAULT false,
  first_watched_at timestamptz NOT NULL DEFAULT now(),
  last_watched_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

-- Serves "continue watching" and history pages, most recent first.
CREATE INDEX watch_history_user_recent_idx ON watch_history (user_id, last_watched_at DESC);

COMMENT ON TABLE likes IS 'One like per user per video.';
COMMENT ON TABLE bookmarks IS 'Videos a user saved to watch later (favorites).';
COMMENT ON TABLE watch_history IS 'Latest playback position per user and video; upserted while watching.';
