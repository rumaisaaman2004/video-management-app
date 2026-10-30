CREATE TABLE video_assets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    uuid NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
  -- source: original upload; rendition: transcoded quality; thumbnail: preview image.
  kind        text NOT NULL CHECK (kind IN ('source', 'rendition', 'thumbnail')),
  -- Distinguishes assets of the same kind, e.g. '480p' for a rendition.
  label       text NOT NULL DEFAULT 'default' CHECK (char_length(label) BETWEEN 1 AND 30),
  -- Storage-agnostic key (relative path or object key), never an absolute path or URL.
  storage_key text NOT NULL UNIQUE,
  mime_type   text NOT NULL,
  size_bytes  bigint NOT NULL CHECK (size_bytes >= 0),
  width       integer CHECK (width > 0),
  height      integer CHECK (height > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, kind, label)
);

COMMENT ON TABLE video_assets IS 'Files belonging to a video: source upload, quality renditions and thumbnails.';
