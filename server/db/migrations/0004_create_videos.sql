CREATE TABLE videos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT: removing an uploader must be handled explicitly so stored files are not orphaned.
  uploader_id      uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  category_id      uuid REFERENCES categories (id) ON DELETE SET NULL,
  title            text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description      text CHECK (char_length(description) <= 5000),
  -- processing: uploaded, metadata/thumbnail pending; ready: playable; failed: processing error.
  status           text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  visibility       text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  duration_seconds integer CHECK (duration_seconds >= 0),
  view_count       bigint NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  -- Weighted full-text index: title matches rank above description matches.
  search_vector    tsvector GENERATED ALWAYS AS (
                     setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                     setweight(to_tsvector('english', coalesce(description, '')), 'B')
                   ) STORED,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX videos_uploader_id_idx ON videos (uploader_id);
CREATE INDEX videos_category_id_idx ON videos (category_id);
CREATE INDEX videos_search_vector_idx ON videos USING gin (search_vector);
-- Serves the main library query: playable public videos, newest first.
CREATE INDEX videos_public_library_idx ON videos (created_at DESC)
  WHERE status = 'ready' AND visibility = 'public';

CREATE TRIGGER videos_set_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE videos IS 'Video metadata. Physical files are tracked in video_assets.';
