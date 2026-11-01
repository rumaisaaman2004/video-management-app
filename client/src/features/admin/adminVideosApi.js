import { api, upload } from '../../lib/apiClient.js';

export const ADMIN_PAGE_SIZE = 20;

/** Every video, whatever its status or visibility (the API shows admins everything). */
export function listAdminVideos({ q, status, visibility, sort, page }, signal) {
  return api.get('/videos', {
    query: { q, status, visibility, sort, page, pageSize: ADMIN_PAGE_SIZE },
    signal,
  });
}

export async function getVideo(id, signal) {
  return (await api.get(`/videos/${id}`, { signal })).data;
}

/** Uploads a new video; `onProgress(fraction)` reports how much has been sent. */
export async function uploadVideo(formData, { onProgress, signal }) {
  return (await upload('/videos', formData, { onProgress, signal })).data;
}

export async function updateVideo(id, changes) {
  return (await api.patch(`/videos/${id}`, changes)).data;
}

export function deleteVideo(id) {
  return api.delete(`/videos/${id}`);
}

export async function replaceThumbnail(id, imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);
  return (await upload(`/videos/${id}/thumbnail`, formData, { method: 'PUT' })).data;
}

export async function captureThumbnailFrame(id, atSeconds) {
  return (await api.post(`/videos/${id}/thumbnail/frame`, { atSeconds })).data;
}
