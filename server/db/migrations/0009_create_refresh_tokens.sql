CREATE TABLE refresh_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Every token issued from one login shares a family. If a token that was already
  -- exchanged is presented again, it was likely stolen, so the whole family is revoked.
  family_id  uuid NOT NULL,
  -- SHA-256 of the token; the raw value only ever exists in the user's cookie.
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  -- Set when the token is exchanged for a new one; kept to detect reuse.
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens (family_id);

COMMENT ON TABLE refresh_tokens IS 'Login sessions. Tokens are single-use and rotated on every refresh.';
