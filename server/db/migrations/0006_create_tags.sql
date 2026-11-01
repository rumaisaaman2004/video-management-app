CREATE TABLE tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE CHECK (name = lower(name) AND char_length(name) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE video_tags (
  video_id uuid NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
  tag_id   uuid NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

-- The primary key covers lookups by video; this covers "all videos with tag X".
CREATE INDEX video_tags_tag_id_idx ON video_tags (tag_id);

COMMENT ON TABLE tags IS 'Free-form lowercase keywords for finer-grained filtering than categories.';
