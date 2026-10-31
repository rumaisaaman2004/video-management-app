// Quality levels offered in the player, named by the frame's short side ("720p").
// Using the short side gives portrait (phone) videos the same levels as landscape ones.
export const QUALITY_LEVELS = [360, 480, 720];

/** H.264 with 4:2:0 color requires even frame dimensions. */
function toEven(value) {
  return Math.max(2, Math.round(value / 2) * 2);
}

/**
 * Plans one rendition per quality level the source can fill, never upscaling.
 * A source smaller than the lowest level gets a single rendition at its own size.
 */
export function planRenditions({ width, height }) {
  const shortSide = Math.min(width, height);
  const levels = QUALITY_LEVELS.filter((level) => level <= shortSide);
  const targets = levels.length > 0 ? levels : [toEven(shortSide)];

  return targets.map((target) => {
    const scale = target / shortSide;
    return {
      label: `${target}p`,
      width: toEven(width * scale),
      height: toEven(height * scale),
    };
  });
}
