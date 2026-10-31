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

/** Generates a solid-color image in the given format (png, jpg, ...). */
export async function createSampleImage({ name, width, height }) {
  await mkdir(SAMPLES_DIR, { recursive: true });
  const outputPath = path.join(SAMPLES_DIR, name);
  await execFileAsync(env.FFMPEG_PATH, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `color=c=orange:s=${width}x${height}`,
    '-frames:v',
    '1',
    '-y',
    outputPath,
  ]);
  return outputPath;
}

/** Reads the codec and dimensions of a media file. */
export async function probeDimensions(filePath) {
  const { stdout } = await execFileAsync(env.FFPROBE_PATH, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=codec_name,width,height',
    '-of',
    'json',
    filePath,
  ]);
  const [stream] = JSON.parse(stdout).streams;
  return { codec: stream.codec_name, width: stream.width, height: stream.height };
}

/** Writes an arbitrary file into the samples folder, e.g. a fake or oversized "video". */
export async function createSampleFile(name, contents) {
  await mkdir(SAMPLES_DIR, { recursive: true });
  const filePath = path.join(SAMPLES_DIR, name);
  await writeFile(filePath, contents);
  return filePath;
}
