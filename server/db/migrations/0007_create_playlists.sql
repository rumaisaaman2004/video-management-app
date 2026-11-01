CREATE TABLE playlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
  description text CHECK (char_length(description) <= 1000),
  visibility  text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX playlists_owner_id_idx ON playlists (owner_id);

CREATE TRIGGER playlists_set_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE playlist_videos (
  playlist_id uuid NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
  position    integer NOT NULL CHECK (position >= 0),
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, video_id),
  -- Deferred so a whole playlist can be reordered inside one transaction.
  CONSTRAINT playlist_videos_position_key UNIQUE (playlist_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX playlist_videos_video_id_idx ON playlist_videos (video_id);

COMMENT ON TABLE playlist_videos IS 'Ordered membership of videos in playlists.';
