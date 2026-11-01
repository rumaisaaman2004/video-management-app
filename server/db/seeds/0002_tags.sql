INSERT INTO tags (name) VALUES
  ('beginner'),
  ('intermediate'),
  ('advanced'),
  ('tutorial'),
  ('javascript'),
  ('react'),
  ('css'),
  ('html'),
  ('postgresql'),
  ('python')
ON CONFLICT (name) DO NOTHING;
