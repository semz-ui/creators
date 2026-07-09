import * as SecureStore from 'expo-secure-store';

import { useSessionStore } from '../session/session.store';

const RESULT = {
  user: { id: 'u1', email: 'a@b.co' },
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
};

const flushPersist = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  useSessionStore.getState().clear();
});

describe('session store', () => {
  it('stores the full session in memory', () => {
    useSessionStore.getState().setSession(RESULT);
    const state = useSessionStore.getState();
    expect(state.user).toEqual(RESULT.user);
    expect(state.accessToken).toBe('access-1');
    expect(state.refreshToken).toBe('refresh-1');
  });

  it('persists only the user and refresh token — never the access token', async () => {
    useSessionStore.getState().setSession(RESULT);
    await flushPersist();

    const setItem = SecureStore.setItemAsync as jest.Mock;
    const lastCall = setItem.mock.calls.at(-1) as [string, string];
    expect(lastCall[0]).toBe('reelo.session');
    const persisted = JSON.parse(lastCall[1]) as { state: Record<string, unknown> };
    expect(persisted.state).toEqual({ user: RESULT.user, refreshToken: 'refresh-1' });
    expect(JSON.stringify(persisted)).not.toContain('access-1');
  });

  it('clear() wipes the session', () => {
    useSessionStore.getState().setSession(RESULT);
    useSessionStore.getState().clear();
    const state = useSessionStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
