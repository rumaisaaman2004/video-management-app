import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { env } from '../../src/config/env.js';

const execFileAsync = promisify(execFile);
const SAMPLES_DIR = path.join(os.tmpdir(), 'video-management-app-test-samples');

/**
 * Generates a short MP4 from FFmpeg's built-in test pattern (and a tone when
 * `withAudio`), so tests use real media without committing binary files.
 */
export async function createSampleVideo({ name, width, height, withAudio = true }) {
  await mkdir(SAMPLES_DIR, { recursive: true });
  const outputPath = path.join(SAMPLES_DIR, `${name}.mp4`);

  const audioInput = withAudio ? ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=1'] : [];
  const audioCodec = withAudio ? ['-c:a', 'aac'] : [];

  await execFileAsync(env.FFMPEG_PATH, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `testsrc=size=${width}x${height}:rate=15:duration=1`,
    ...audioInput,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-pix_fmt',
    'yuv420p',
    ...audioCodec,
    '-shortest',
    '-y',
    outputPath,
  ]);

  return outputPath;
}

/** Writes an arbitrary file into the samples folder, e.g. a fake or oversized "video". */
export async function createSampleFile(name, contents) {
  await mkdir(SAMPLES_DIR, { recursive: true });
  const filePath = path.join(SAMPLES_DIR, name);
  await writeFile(filePath, contents);
  return filePath;
}
