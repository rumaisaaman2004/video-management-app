import { pickInitialQuality, resumePosition } from './playback.js';

const renditions = [
  { label: '360p', width: 640, height: 360 },
  { label: '480p', width: 854, height: 480 },
  { label: '720p', width: 1280, height: 720 },
];

describe('pickInitialQuality', () => {
  it('uses the best quality on large screens', () => {
    expect(pickInitialQuality(renditions, { viewportWidth: 1400 }).label).toBe('720p');
  });

  it('caps the quality on small screens', () => {
    expect(pickInitialQuality(renditions, { viewportWidth: 390 }).label).toBe('480p');
  });

  it('caps portrait videos by their short side too', () => {
    const portrait = [
      { label: '360p', width: 360, height: 640 },
      { label: '720p', width: 720, height: 1280 },
    ];
    expect(pickInitialQuality(portrait, { viewportWidth: 390 }).label).toBe('360p');
  });

  it("prefers the viewer's saved choice when this video has it", () => {
    expect(
      pickInitialQuality(renditions, { preferredLabel: '360p', viewportWidth: 1400 }).label,
    ).toBe('360p');
    expect(
      pickInitialQuality(renditions, { preferredLabel: '1080p', viewportWidth: 1400 }).label,
    ).toBe('720p');
  });

  it('falls back to the only rendition of a small video', () => {
    const tiny = [{ label: '120p', width: 160, height: 120 }];
    expect(pickInitialQuality(tiny, { viewportWidth: 390 }).label).toBe('120p');
  });
});

describe('resumePosition', () => {
  it.each([
    [0, 300, 0],
    [3, 300, 0], // barely started: start over
    [125, 300, 125],
    [295, 300, 0], // practically finished: start over
    [125, null, 125],
  ])('saved %s s of %s s → start at %s s', (saved, duration, expected) => {
    expect(resumePosition(saved, duration)).toBe(expected);
  });
});
