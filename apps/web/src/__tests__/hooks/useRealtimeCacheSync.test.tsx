import { renderHook } from '@testing-library/react';
import { useRealtimeCacheSync } from '@/shared/hooks/useRealtimeCacheSync';

const removeChannelMock = jest.fn();
const subscribeMock = jest.fn();
const onMock = jest.fn();
const channelMock = {
  on: onMock,
  subscribe: subscribeMock,
};
const createClientMock = jest.fn();

jest.mock('@/shared/lib/supabase/client', () => ({
  createClient: () => createClientMock(),
}));

describe('useRealtimeCacheSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    onMock.mockReturnValue(channelMock);
    subscribeMock.mockImplementation(() => channelMock);
    createClientMock.mockReturnValue({
      channel: jest.fn().mockReturnValue(channelMock),
      removeChannel: removeChannelMock,
    });
  });

  it('enabled=false면 구독을 생성하지 않는다', () => {
    renderHook(() =>
      useRealtimeCacheSync({
        table: 'projects',
        enabled: false,
      })
    );

    expect(createClientMock).not.toHaveBeenCalled();
    expect(onMock).not.toHaveBeenCalled();
  });

  it('realtime 이벤트 발생 시 onInvalidate를 실행한다', () => {
    const onInvalidate = jest.fn();

    renderHook(() =>
      useRealtimeCacheSync({
        table: 'projects',
        onInvalidate,
      })
    );

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(onMock).toHaveBeenCalledTimes(1);

    const realtimeHandler = onMock.mock.calls[0][2] as () => void;
    realtimeHandler();

    expect(onInvalidate).toHaveBeenCalledTimes(1);
  });

  it('unmount 시 채널을 정리한다', () => {
    const { unmount } = renderHook(() =>
      useRealtimeCacheSync({
        table: 'buildings',
      })
    );

    unmount();

    expect(removeChannelMock).toHaveBeenCalledTimes(1);
    expect(removeChannelMock).toHaveBeenCalledWith(channelMock);
  });
});
