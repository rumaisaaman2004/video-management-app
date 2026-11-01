/**
 * Fills the library with generated demo videos (development only), so the app
 * can be tried out and demonstrated without real lecture recordings.
 *
 * Each video shows its title and a running timer, has a tone as audio, and goes
 * through the real upload pipeline: the same checks, storage and FFmpeg
 * processing (thumbnail and quality renditions) as an upload from the app.
 * Videos that already exist (same title) are skipped, so it is safe to re-run.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { env } from '../src/config/env.js';
import { createContainer } from '../src/container.js';
import { pool } from '../src/db/pool.js';

const execFileAsync = promisify(execFile);

const DEMO_VIDEOS = [
  {
    title: 'Introduction to HTML',
    description: 'Elements, attributes and the structure of a web page.',
    category: 'web-development',
    tags: ['html', 'beginner'],
    seconds: 60,
    color: '#1e3a8a',
  },
  {
    title: 'CSS Flexbox Basics',
    description: 'Lay out rows and columns with display: flex, gap and alignment.',
    category: 'web-development',
    tags: ['css', 'beginner', 'tutorial'],
    seconds: 75,
    color: '#0f766e',
  },
  {
    title: 'JavaScript Promises Explained',
    description: 'What a promise is, then/catch, and async/await.',
    category: 'programming',
    tags: ['javascript', 'intermediate'],
    seconds: 90,
    color: '#a16207',
  },
  {
    title: 'React State and Props',
    description: 'Passing data down with props and remembering it with useState.',
    category: 'web-development',
    tags: ['react', 'javascript', 'beginner'],
    seconds: 80,
    color: '#155e75',
  },
  {
    title: 'SQL Joins with PostgreSQL',
    description: 'Inner, left and right joins, with examples you can run.',
    category: 'databases',
    tags: ['postgresql', 'intermediate'],
    seconds: 70,
    color: '#334155',
  },
  {
    title: 'Python Lists and Loops',
    description: 'Creating lists and walking through them with for loops.',
    category: 'programming',
    tags: ['python', 'beginner'],
    seconds: 55,
    color: '#365314',
  },
  {
    title: 'Design Principles: Contrast',
    description: 'Using size, color and weight so the important things stand out.',
    category: 'design',
    tags: ['beginner'],
    seconds: 45,
    color: '#7e22ce',
  },
  {
    title: 'Statistics: Mean, Median and Mode',
    description: 'Three ways to describe the middle of a data set, and when to use each.',
    category: 'mathematics',
    tags: ['beginner'],
    seconds: 65,
    color: '#9f1239',
  },
];

/** Renders one 720p demo clip: a colored background with the title and a running timer. */
async function renderClip(video, workDir) {
  const index = DEMO_VIDEOS.indexOf(video);
  // Text goes through files so titles never need escaping for FFmpeg's filter syntax.
  const titleFile = path.join(workDir, `title-${index}.txt`);
  await writeFile(titleFile, video.title);
  const outputPath = path.join(workDir, `demo-${index}.mp4`);

  const filters = [
    `drawtext=textfile='${titleFile}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2-40`,
    "drawtext=text='%{pts\\:hms}':fontcolor=white@0.8:fontsize=36:x=(w-text_w)/2:y=(h/2)+50",
  ].join(',');

  await execFileAsync(env.FFMPEG_PATH, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `color=c=${video.color}:s=1280x720:r=30:d=${video.seconds}`,
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=330:duration=${video.seconds}`,
    '-vf',
    filters,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    '-y',
    outputPath,
  ]);
  return outputPath;
}

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to add demo videos in production');
  }

  const { rows: admins } = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1",
  );
  if (admins.length === 0) throw new Error('No admin user found. Run "npm run db:seed" first.');

  const { rows: categories } = await pool.query('SELECT id, slug FROM categories');
  const categoryIds = new Map(categories.map((category) => [category.slug, category.id]));
  const { rows: existing } = await pool.query('SELECT title FROM videos');
  const existingTitles = new Set(existing.map((row) => row.title));

  const missing = DEMO_VIDEOS.filter((video) => !existingTitles.has(video.title));
  if (missing.length === 0) {
    console.log('All demo videos are already in the library.');
    return;
  }

  const { videosService, videoProcessor } = createContainer({ pool });
  const workDir = await mkdtemp(path.join(os.tmpdir(), 'demo-media-'));

  try {
    for (const video of missing) {
      process.stdout.write(`Rendering "${video.title}"… `);
      const filePath = await renderClip(video, workDir);
      await videosService.upload({
        uploaderId: admins[0].id,
        file: { path: filePath },
        metadata: {
          title: video.title,
          description: video.description,
          categoryId: categoryIds.get(video.category),
          visibility: 'public',
          tags: video.tags,
        },
      });
      console.log('uploaded');
    }

    console.log('Processing (thumbnails and quality versions)…');
    await videoProcessor.whenIdle();

    const { rows } = await pool.query(
      'SELECT status, count(*)::int AS count FROM videos WHERE title = ANY($1) GROUP BY status',
      [missing.map((video) => video.title)],
    );
    console.log(`Done: ${rows.map((row) => `${row.count} ${row.status}`).join(', ')}.`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
