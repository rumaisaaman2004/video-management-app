import { useEffect, useState } from 'react';
import { getVideo } from './adminVideosApi.js';

const POLL_INTERVAL_MS = 2000;

/**
 * Follows a freshly uploaded video until processing finishes: checks every
 * two seconds while its status is "processing". Returns `{ video, error }`.
 */
export function useVideoProcessingStatus(videoId) {
  const [state, setState] = useState({ video: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    let timer;

    async function check() {
      try {
        const video = await getVideo(videoId, controller.signal);
        setState({ video, error: null });
        if (video.status === 'processing') timer = setTimeout(check, POLL_INTERVAL_MS);
      } catch (error) {
        if (!controller.signal.aborted) setState((current) => ({ ...current, error }));
      }
    }

    check();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [videoId]);

  return state;
}
