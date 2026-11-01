import { spawn } from 'node:child_process';
import { env } from '../config/env.js';

// Long uploads can take a while to transcode; anything beyond this is treated as stuck.
const COMMAND_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const STDERR_TAIL_LENGTH = 2000;

// Inputs may only be read from local files, so crafted media (e.g. a playlist
// disguised as a video) cannot make FFmpeg fetch URLs from the network.
const SAFE_INPUT_OPTIONS = ['-protocol_whitelist', 'file'];

/**
 * Runs a binary with an argument array (never through a shell, so no command
 * injection) and resolves with stdout, or rejects with the end of stderr.
 */
function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { timeout: COMMAND_TIMEOUT_MS });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk).slice(-STDERR_TAIL_LENGTH);
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) return resolve(stdout);
      const reason = signal ? `killed by ${signal}` : `exit code ${code}`;
      reject(new Error(`${binary} failed (${reason}): ${stderr.trim()}`));
    });
  });
}

/** Rotation in degrees from stream metadata (phones record portrait video as rotated landscape). */
function readRotation(stream) {
  const sideDataRotation = stream.side_data_list?.find((data) => data.rotation !== undefined);
  return Number(sideDataRotation?.rotation ?? stream.tags?.rotate ?? 0);
}

/**
 * Reads duration, display dimensions (after rotation) and audio presence.
 * `video` is null when the file has no video stream.
 */
export async function probe(inputPath) {
  const output = await run(env.FFPROBE_PATH, [
    '-v',
    'error',
    ...SAFE_INPUT_OPTIONS,
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    inputPath,
  ]);
  const { format = {}, streams = [] } = JSON.parse(output);

  const videoStream = streams.find(
    (stream) => stream.codec_type === 'video' && !stream.disposition?.attached_pic,
  );
  const isRotatedSideways = videoStream && Math.abs(readRotation(videoStream)) % 180 === 90;

  return {
    durationSeconds: Number.parseFloat(format.duration) || 0,
    hasAudio: streams.some((stream) => stream.codec_type === 'audio'),
    video: videoStream
      ? {
          width: isRotatedSideways ? videoStream.height : videoStream.width,
          height: isRotatedSideways ? videoStream.width : videoStream.height,
        }
      : null,
  };
}

export function extractThumbnail(inputPath, outputPath, { atSeconds, width }) {
  return run(env.FFMPEG_PATH, [
    '-hide_banner',
    '-loglevel',
    'error',
    ...SAFE_INPUT_OPTIONS,
    '-ss',
    String(atSeconds),
    '-i',
    inputPath,
    '-frames:v',
    '1',
    '-vf',
    `scale=${width}:-2`,
    '-q:v',
    '3',
    '-y',
    outputPath,
  ]);
}

/**
 * Encodes a browser-friendly H.264/AAC MP4 at the given output size.
 * `+faststart` moves the index to the front so playback can begin before download ends.
 */
export function transcodeToMp4(inputPath, outputPath, { width, height, hasAudio }) {
  const audioArgs = hasAudio ? ['-map', '0:a:0', '-c:a', 'aac', '-b:a', '128k'] : ['-an'];

  return run(env.FFMPEG_PATH, [
    '-hide_banner',
    '-loglevel',
    'error',
    ...SAFE_INPUT_OPTIONS,
    '-i',
    inputPath,
    '-map',
    '0:v:0',
    ...audioArgs,
    '-sn',
    '-vf',
    `scale=${width}:${height}`,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-y',
    outputPath,
  ]);
}
