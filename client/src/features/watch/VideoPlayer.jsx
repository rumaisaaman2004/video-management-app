import 'video.js/dist/video-js.css';

import { useEffect, useRef } from 'react';
// Core build: the full player minus the HLS/DASH engine, which MP4 playback does not need.
import videojs from 'video.js/core.es.js';
import {
  pickInitialQuality,
  PLAYBACK_RATES,
  PROGRESS_SAVE_INTERVAL_MS,
  readPreferredQuality,
  resumePosition,
  savePreferredQuality,
} from './playback.js';
import { addQualityMenu } from './qualityMenu.js';
import styles from './VideoPlayer.module.scss';

/** Loads another rendition while keeping the position, speed and play/pause state. */
function switchQuality(player, rendition) {
  const position = player.currentTime();
  const wasPaused = player.paused();
  const rate = player.playbackRate();

  player.src({ src: rendition.url, type: 'video/mp4' });
  player.one('loadedmetadata', () => {
    player.currentTime(position);
    player.playbackRate(rate);
    if (!wasPaused) player.play()?.catch(() => {});
  });
}

/**
 * Video.js player for one video.
 *
 * - `startAt`: saved position in seconds; playback resumes there when sensible.
 * - `onPlaybackStart()`: called once, on the first play (used to count a view).
 * - `onPositionSave(seconds)`: called every few seconds while playing and on
 *   pause, end and unmount (used to save progress for signed-in viewers).
 *
 * The player is created imperatively and disposed on unmount, as the Video.js
 * React guide recommends; re-create it for another video by changing `key`.
 */
export function VideoPlayer({ video, startAt = 0, onPlaybackStart, onPositionSave }) {
  const containerRef = useRef(null);

  // Always call the latest callbacks without re-creating the player.
  const callbacksRef = useRef({ onPlaybackStart, onPositionSave });
  useEffect(() => {
    callbacksRef.current = { onPlaybackStart, onPositionSave };
  });

  useEffect(() => {
    const renditions = video.renditions;
    const initial = pickInitialQuality(renditions, {
      preferredLabel: readPreferredQuality(),
      viewportWidth: window.innerWidth,
    });

    const element = document.createElement('video-js');
    element.classList.add('vjs-big-play-centered');
    containerRef.current.appendChild(element);

    const player = videojs(element, {
      controls: true,
      fluid: true,
      aspectRatio: '16:9',
      preload: 'metadata',
      poster: video.thumbnailUrl ?? undefined,
      playbackRates: PLAYBACK_RATES,
      userActions: { hotkeys: true },
      sources: [{ src: initial.url, type: 'video/mp4' }],
    });

    if (renditions.length > 1) {
      const qualityMenu = addQualityMenu(player, {
        qualities: renditions,
        current: initial.label,
        onSelect(label) {
          const rendition = renditions.find((r) => r.label === label);
          switchQuality(player, rendition);
          qualityMenu.setCurrent(label);
          savePreferredQuality(label);
        },
      });
    }

    player.one('loadedmetadata', () => {
      const position = resumePosition(startAt, player.duration());
      if (position > 0) player.currentTime(position);
    });
    player.one('play', () => callbacksRef.current.onPlaybackStart?.());

    let lastSavedAt = 0;
    function savePosition() {
      const seconds = player.currentTime();
      if (seconds > 0) callbacksRef.current.onPositionSave?.(seconds);
      lastSavedAt = Date.now();
    }
    player.on('timeupdate', () => {
      if (!player.paused() && Date.now() - lastSavedAt >= PROGRESS_SAVE_INTERVAL_MS) savePosition();
    });
    player.on('pause', savePosition);
    player.on('ended', savePosition);

    return () => {
      if (player.isDisposed()) return;
      savePosition();
      player.dispose();
    };
    // The player is built once per video; `startAt` only matters when it is created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  return <div className={styles.player} ref={containerRef} data-vjs-player />;
}
