import { describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { pool } from '../src/db/pool.js';
import { findStartupProblems } from '../src/startupChecks.js';

const tools = { ffmpegPath: env.FFMPEG_PATH, ffprobePath: env.FFPROBE_PATH };

describe('findStartupProblems', () => {
  it('finds no problems when the database and FFmpeg are ready', async () => {
    expect(await findStartupProblems({ pool, ...tools })).toEqual([]);
  });

  it('explains missing media tools and which setting to change', async () => {
    const problems = await findStartupProblems({
      pool,
      ffmpegPath: 'definitely-not-ffmpeg',
      ffprobePath: env.FFPROBE_PATH,
    });

    expect(problems).toEqual([expect.stringContaining('FFMPEG_PATH')]);
  });

  it('explains an unreachable database', async () => {
    const unreachablePool = { query: () => Promise.reject(new Error('connection refused')) };

    const problems = await findStartupProblems({ pool: unreachablePool, ...tools });

    expect(problems).toEqual([expect.stringContaining('Cannot reach the database')]);
  });
});
