import { api } from '../../lib/apiClient.js';

export async function listMyPlaylists(signal) {
  return (await api.get('/me/playlists', { signal })).data;
}

/** A playlist with its videos in order (only the videos the viewer may watch). */
export async function getPlaylist(id, signal) {
  return (await api.get(`/playlists/${id}`, { signal })).data;
}

export async function createPlaylist(fields) {
  return (await api.post('/playlists', fields)).data;
}

export async function updatePlaylist(id, changes) {
  return (await api.patch(`/playlists/${id}`, changes)).data;
}

export function deletePlaylist(id) {
  return api.delete(`/playlists/${id}`);
}

/** Each of these returns the updated playlist. */
export async function addVideoToPlaylist(playlistId, videoId) {
  return (await api.post(`/playlists/${playlistId}/videos`, { videoId })).data;
}

export async function removeVideoFromPlaylist(playlistId, videoId) {
  return (await api.delete(`/playlists/${playlistId}/videos/${videoId}`)).data;
}

export async function reorderPlaylist(playlistId, videoIds) {
  return (await api.put(`/playlists/${playlistId}/videos/order`, { videoIds })).data;
}
