CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  -- Emails are normalized to lowercase so uniqueness is case-insensitive.
  email         text NOT NULL UNIQUE CHECK (email = lower(email) AND char_length(email) <= 254),
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE users IS 'Registered accounts. Admins can manage all content; users manage their own.';
