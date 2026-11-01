import { act, renderHook, waitFor } from '@testing-library/react';
import { useApi } from './useApi.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useApi', () => {
  it('reports loading, then the data', async () => {
    const { result } = renderHook(() => useApi(() => Promise.resolve('videos'), []));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ data: 'videos', error: null });
  });

  it('reports errors and can retry', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('videos');
    const { result } = renderHook(() => useApi(request, []));

    await waitFor(() => expect(result.current.error?.message).toBe('offline'));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.data).toBe('videos'));
    expect(result.current.error).toBeNull();
  });

  it('cancels the previous request when its inputs change', async () => {
    const slow = deferred();
    const signals = [];
    const { result, rerender } = renderHook(
      ({ page }) =>
        useApi(
          (signal) => {
            signals.push(signal);
            return page === 1 ? slow.promise : Promise.resolve('page 2');
          },
          [page],
        ),
      { initialProps: { page: 1 } },
    );

    rerender({ page: 2 });
    await waitFor(() => expect(result.current.data).toBe('page 2'));

    // The outdated page-1 response arrives late and must not replace page 2.
    slow.resolve('page 1');
    await Promise.resolve();

    expect(signals[0].aborted).toBe(true);
    expect(result.current.data).toBe('page 2');
  });

  it('keeps the previous data visible while reloading', async () => {
    const next = deferred();
    const request = vi.fn().mockResolvedValueOnce('first').mockReturnValueOnce(next.promise);
    const { result } = renderHook(() => useApi(request, []));
    await waitFor(() => expect(result.current.data).toBe('first'));

    act(() => result.current.reload());

    expect(result.current).toMatchObject({ isLoading: true, data: 'first' });
    await act(async () => next.resolve('second'));
    expect(result.current).toMatchObject({ isLoading: false, data: 'second' });
  });
});
