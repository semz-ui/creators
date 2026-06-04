import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionStore } from './session.store';

const result = {
  user: { id: 'u1', email: 'a@b.com' },
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
};

describe('session store', () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
    localStorage.clear();
  });

  it('setSession stores user + tokens', () => {
    useSessionStore.getState().setSession(result);
    const state = useSessionStore.getState();
    expect(state.user).toEqual(result.user);
    expect(state.accessToken).toBe('access-1');
    expect(state.refreshToken).toBe('refresh-1');
  });

  it('setTokens rotates without dropping the user', () => {
    useSessionStore.getState().setSession(result);
    useSessionStore.getState().setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    const state = useSessionStore.getState();
    expect(state.accessToken).toBe('access-2');
    expect(state.refreshToken).toBe('refresh-2');
    expect(state.user).toEqual(result.user);
  });

  it('persists only the refresh token + user (not the access token)', () => {
    useSessionStore.getState().setSession(result);
    const persisted = JSON.parse(localStorage.getItem('reelo.session') ?? '{}');
    expect(persisted.state.refreshToken).toBe('refresh-1');
    expect(persisted.state.user).toEqual(result.user);
    expect(persisted.state.accessToken).toBeUndefined();
  });

  it('clear wipes the session', () => {
    useSessionStore.getState().setSession(result);
    useSessionStore.getState().clear();
    const state = useSessionStore.getState();
    expect(state.user).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
