-- Development-only demo accounts. Both use the password: Password123!
-- (bcrypt hash, cost 12). `npm run db:seed` refuses to run in production.
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Demo Admin', 'admin@example.com', '$2b$12$P8TrBhg40kCgqLNkLL/44uPpyqelBl2VBMv.j2oUNAJihp.ze.Ntu', 'admin'),
  ('Demo User',  'user@example.com',  '$2b$12$P8TrBhg40kCgqLNkLL/44uPpyqelBl2VBMv.j2oUNAJihp.ze.Ntu', 'user')
ON CONFLICT (email) DO NOTHING;
