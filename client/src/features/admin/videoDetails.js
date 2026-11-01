// Same limits as the API, so problems show before anything is sent.
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 40;

export const EMPTY_VIDEO_DETAILS = {
  title: '',
  description: '',
  categoryId: '',
  visibility: 'public',
  tags: '',
};

/** Form values for an existing video. Tags are edited as one comma-separated text. */
export function videoDetailsFrom(video) {
  return {
    title: video.title,
    description: video.description ?? '',
    categoryId: video.category?.id ?? '',
    visibility: video.visibility,
    tags: video.tags.join(', '),
  };
}

/** "React, hooks,react " → ["react", "hooks"] (lowercase, no blanks or repeats). */
export function parseTags(text) {
  const names = text
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(names)];
}

/** Returns `{ field: message }` for every problem found. */
export function validateVideoDetails(values) {
  const errors = {};
  const title = values.title.trim();
  const tags = parseTags(values.tags);

  if (!title) errors.title = 'Title is required';
  else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be at most ${MAX_TITLE_LENGTH} characters`;
  }
  if (values.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  if (tags.length > MAX_TAGS) errors.tags = `Use at most ${MAX_TAGS} tags`;
  else if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    errors.tags = `Each tag must be at most ${MAX_TAG_LENGTH} characters`;
  }
  return errors;
}

/** The JSON body for updating a video. An empty category removes it. */
export function toUpdatePayload(values) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    categoryId: values.categoryId || null,
    visibility: values.visibility,
    tags: parseTags(values.tags),
  };
}

/** Multipart form data for an upload; empty optional fields are left out. */
export function toUploadFormData(values, file) {
  const formData = new FormData();
  formData.append('title', values.title.trim());
  formData.append('visibility', values.visibility);
  if (values.description.trim()) formData.append('description', values.description.trim());
  if (values.categoryId) formData.append('categoryId', values.categoryId);
  const tags = parseTags(values.tags);
  if (tags.length > 0) formData.append('tags', tags.join(','));
  formData.append('file', file);
  return formData;
}
