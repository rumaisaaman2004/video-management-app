import {
  parseTags,
  toUpdatePayload,
  validateVideoDetails,
  videoDetailsFrom,
} from './videoDetails.js';
import { formatFileSize, titleFromFileName, validateVideoFile } from './videoFile.js';

describe('video details', () => {
  it('parses comma-separated tags into a clean, unique, lowercase list', () => {
    expect(parseTags(' React, hooks,react ,, Node.js ')).toEqual(['react', 'hooks', 'node.js']);
  });

  it('validates title, description and tags like the server', () => {
    const tooManyTags = Array.from({ length: 11 }, (_, index) => `tag${index}`).join(',');

    expect(validateVideoDetails({ title: '  ', description: '', tags: tooManyTags })).toEqual({
      title: 'Title is required',
      tags: 'Use at most 10 tags',
    });
    expect(validateVideoDetails({ title: 'Hooks', description: '', tags: 'react' })).toEqual({});
  });

  it('round-trips a video into form values and back into an update', () => {
    const values = videoDetailsFrom({
      title: 'Hooks',
      description: null,
      category: null,
      visibility: 'private',
      tags: ['react', 'hooks'],
    });

    expect(values).toEqual({
      title: 'Hooks',
      description: '',
      categoryId: '',
      visibility: 'private',
      tags: 'react, hooks',
    });
    expect(toUpdatePayload(values)).toEqual({
      title: 'Hooks',
      description: '',
      categoryId: null,
      visibility: 'private',
      tags: ['react', 'hooks'],
    });
  });
});

describe('video file checks', () => {
  const fileOf = (name, sizeBytes = 1024) => ({ name, size: sizeBytes });

  it('accepts supported videos and rejects others before uploading', () => {
    expect(validateVideoFile(null)).toBe('Choose a video file to upload');
    expect(validateVideoFile(fileOf('lesson.MP4'))).toBeNull();
    expect(validateVideoFile(fileOf('notes.pdf'))).toBe('Choose an MP4, MOV, WebM or MKV file');
    expect(validateVideoFile(fileOf('huge.mov', 501 * 1024 * 1024))).toBe(
      'The file is larger than 500 MB',
    );
  });

  it('suggests a title from the file name', () => {
    expect(titleFromFileName('react_hooks-intro.final.mp4')).toBe('React hooks intro final');
  });

  it('formats file sizes', () => {
    expect(formatFileSize(512)).toBe('1 KB');
    expect(formatFileSize(12.34 * 1024 * 1024)).toBe('12.3 MB');
  });
});
