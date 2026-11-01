// Same limits as the API.
const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 1000;

export const EMPTY_PLAYLIST_DETAILS = { title: '', description: '', visibility: 'private' };

export const PLAYLIST_VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private: only you can see it' },
  { value: 'public', label: 'Public: anyone with the link can see it' },
];

export function playlistDetailsFrom(playlist) {
  return {
    title: playlist.title,
    description: playlist.description ?? '',
    visibility: playlist.visibility,
  };
}

/** Returns `{ field: message }` for every problem found. */
export function validatePlaylistDetails(values) {
  const errors = {};
  const title = values.title.trim();
  if (!title) errors.title = 'Title is required';
  else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be at most ${MAX_TITLE_LENGTH} characters`;
  }
  if (values.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  return errors;
}

export function toPlaylistPayload(values) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    visibility: values.visibility,
  };
}
