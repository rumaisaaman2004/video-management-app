import { describe, expect, it } from 'vitest';
import { planRenditions } from '../../src/modules/videos/renditions.js';

describe('planRenditions', () => {
  it('offers every quality level a Full HD source can fill', () => {
    expect(planRenditions({ width: 1920, height: 1080 })).toEqual([
      { label: '360p', width: 640, height: 360 },
      { label: '480p', width: 854, height: 480 },
      { label: '720p', width: 1280, height: 720 },
    ]);
  });

  it('uses the short side for portrait videos', () => {
    expect(planRenditions({ width: 1080, height: 1920 })).toEqual([
      { label: '360p', width: 360, height: 640 },
      { label: '480p', width: 480, height: 854 },
      { label: '720p', width: 720, height: 1280 },
    ]);
  });

  it('never upscales', () => {
    expect(planRenditions({ width: 854, height: 480 }).map((r) => r.label)).toEqual([
      '360p',
      '480p',
    ]);
  });

  it('keeps a small source at its own size', () => {
    expect(planRenditions({ width: 160, height: 120 })).toEqual([
      { label: '120p', width: 160, height: 120 },
    ]);
  });

  it('always produces even dimensions, as H.264 requires', () => {
    for (const { width, height } of planRenditions({ width: 641, height: 361 })) {
      expect(width % 2).toBe(0);
      expect(height % 2).toBe(0);
    }
  });
});
