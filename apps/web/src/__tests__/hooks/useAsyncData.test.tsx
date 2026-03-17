import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsyncData } from '@/shared/hooks/useAsyncData';

describe('useAsyncData', () => {
  it('autoFetch=true일 때 마운트 시 fetcher를 호출하고 data를 설정한다', async () => {
    const fetcher = jest.fn().mockResolvedValue({ id: '1', name: 'test' });
    const onSuccess = jest.fn();

    const { result } = renderHook(() =>
      useAsyncData(fetcher, [], {
        autoFetch: true,
        onSuccess,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ id: '1', name: 'test' });
    expect(onSuccess).toHaveBeenCalledWith({ id: '1', name: 'test' });
  });

  it('autoFetch=false일 때 초기 자동 호출 없이 refetch로만 실행된다', async () => {
    const fetcher = jest.fn().mockResolvedValue('fetched');

    const { result } = renderHook(() =>
      useAsyncData(fetcher, [], {
        autoFetch: false,
      })
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('fetched');
  });

  it('fetch 실패 시 error 상태와 onError 콜백을 설정한다', async () => {
    const error = new Error('boom');
    const fetcher = jest.fn().mockRejectedValue(error);
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useAsyncData(fetcher, [], {
        autoFetch: true,
        onError,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error?.message).toBe('boom');
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
  });
});
