import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../errors/AppError.js';
import { isUniqueViolation } from '../../errors/databaseErrors.js';
import { presentPlaylist } from './playlists.presenter.js';
import { createPlaylistsRepository } from './playlists.repository.js';
import { MAX_PLAYLIST_VIDEOS } from './playlists.schemas.js';

function hasSameMembers(a, b) {
  const setA = new Set(a);
  return a.length === b.length && setA.size === new Set(b).size && b.every((id) => setA.has(id));
}

export function createPlaylistsService({ pool, videosService }) {
  const playlists = createPlaylistsRepository(pool);

  function canView(playlist, viewer) {
    return (
      playlist.visibility === 'public' ||
      playlist.ownerId === viewer?.id ||
      viewer?.role === 'admin'
    );
  }

  /** Private playlists of other users get 404 so their existence is not revealed. */
  async function findViewable(id, viewer) {
    const playlist = await playlists.findById(id);
    if (!playlist || !canView(playlist, viewer)) throw AppError.notFound('Playlist not found');
    return playlist;
  }

  async function findOwned(id, viewer) {
    const playlist = await findViewable(id, viewer);
    if (playlist.ownerId !== viewer.id) {
      throw AppError.forbidden('Only the owner can change this playlist');
    }
    return playlist;
  }

  async function getById(id, viewer) {
    const playlist = await findViewable(id, viewer);
    const videoIds = await playlists.findVideoIds(id);
    return {
      ...presentPlaylist(playlist),
      videos: await videosService.getCards(videoIds, viewer),
    };
  }

  /**
   * Changes a playlist's videos with its row locked, so two quick edits
   * (e.g. double-clicking "Add") cannot interleave. Returns the updated playlist.
   */
  async function editVideos(id, viewer, work) {
    await findOwned(id, viewer);
    await withTransaction(pool, async (client) => {
      const repository = createPlaylistsRepository(client);
      await repository.lockForUpdate(id);
      await work(repository);
      await repository.touch(id);
    });
    return getById(id, viewer);
  }

  return {
    getById,

    async listMine(viewer) {
      return (await playlists.findByOwner(viewer.id)).map(presentPlaylist);
    },

    async create(viewer, fields) {
      const id = await playlists.create({ ownerId: viewer.id, ...fields });
      return getById(id, viewer);
    },

    async update(id, viewer, changes) {
      await findOwned(id, viewer);
      await playlists.update(id, changes);
      return getById(id, viewer);
    },

    async delete(id, viewer) {
      await findOwned(id, viewer);
      await playlists.delete(id);
    },

    async addVideo(id, viewer, videoId) {
      // Users can only add videos they are allowed to watch.
      await videosService.findViewable(videoId, viewer);

      return editVideos(id, viewer, async (repository) => {
        if ((await repository.countVideos(id)) >= MAX_PLAYLIST_VIDEOS) {
          throw AppError.conflict(`A playlist can hold at most ${MAX_PLAYLIST_VIDEOS} videos`);
        }
        try {
          await repository.appendVideo(id, videoId);
        } catch (err) {
          if (isUniqueViolation(err)) throw AppError.conflict('Video is already in this playlist');
          throw err;
        }
      });
    },

    removeVideo(id, viewer, videoId) {
      return editVideos(id, viewer, async (repository) => {
        const removed = await repository.removeVideo(id, videoId);
        if (!removed) throw AppError.notFound('Video is not in this playlist');
      });
    },

    /**
     * Applies the order the viewer sees. Videos hidden from the viewer (e.g.
     * made private after being added) keep their relative order at the end.
     */
    reorder(id, viewer, orderedVideoIds) {
      return editVideos(id, viewer, async (repository) => {
        const currentIds = await repository.findVideoIds(id);
        const visibleIds = (await videosService.getCards(currentIds, viewer)).map((v) => v.id);

        if (!hasSameMembers(visibleIds, orderedVideoIds)) {
          throw AppError.validation([
            { field: 'body.videoIds', message: 'Must list every video in the playlist once' },
          ]);
        }

        const visible = new Set(visibleIds);
        const hiddenIds = currentIds.filter((videoId) => !visible.has(videoId));
        await repository.reorder(id, [...orderedVideoIds, ...hiddenIds]);
      });
    },
  };
}
