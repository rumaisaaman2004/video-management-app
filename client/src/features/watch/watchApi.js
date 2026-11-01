import { api } from '../../lib/apiClient.js';

export async function getVideoDetails(id, signal) {
  return (await api.get(`/videos/${id}`, { signal })).data;
}

/** Returns `{ liked, likeCount }`. */
export async function setLiked(id, liked) {
  const path = `/videos/${id}/like`;
  return (await (liked ? api.put(path) : api.delete(path))).data;
}

/** Returns `{ bookmarked }`. */
export async function setBookmarked(id, bookmarked) {
  const path = `/videos/${id}/bookmark`;
  return (await (bookmarked ? api.put(path) : api.delete(path))).data;
}

export function saveProgress(id, positionSeconds) {
  return api.put(`/videos/${id}/progress`, { positionSeconds });
}

export function recordView(id) {
  return api.post(`/videos/${id}/views`);
}
