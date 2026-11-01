INSERT INTO categories (name, slug, description) VALUES
  ('Web Development', 'web-development', 'HTML, CSS, JavaScript and modern frontend frameworks.'),
  ('Programming',     'programming',     'Core programming concepts, languages and problem solving.'),
  ('Databases',       'databases',       'Data modeling, SQL and database administration.'),
  ('Data Science',    'data-science',    'Data analysis, visualization and machine learning.'),
  ('Design',          'design',          'UI/UX principles, typography and visual design.'),
  ('Mathematics',     'mathematics',     'Algebra, calculus, statistics and discrete math.'),
  ('Science',         'science',         'Physics, chemistry and biology lessons.'),
  ('Career Skills',   'career-skills',   'Communication, productivity and professional growth.')
ON CONFLICT (slug) DO NOTHING;
