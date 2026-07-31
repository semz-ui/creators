import { beforeEach, describe, expect, it } from 'vitest';

import { postLoginRoute, routeForMode, useModeStore } from './mode.store';

describe('mode store', () => {
  beforeEach(() => {
    useModeStore.getState().clear();
    localStorage.clear();
  });

  it('starts with no preference', () => {
    expect(useModeStore.getState().mode).toBeNull();
  });

  it('persists the chosen mode', () => {
    useModeStore.getState().setMode('assistant');
    const persisted = JSON.parse(localStorage.getItem('reelo.mode') ?? '{}');
    expect(persisted.state.mode).toBe('assistant');
  });

  it('clear wipes the preference', () => {
    useModeStore.getState().setMode('studio');
    useModeStore.getState().clear();
    expect(useModeStore.getState().mode).toBeNull();
  });

  it('maps each mode to its home route', () => {
    expect(routeForMode('assistant')).toBe('/agent');
    expect(routeForMode('studio')).toBe('/dashboard');
  });

  describe('postLoginRoute', () => {
    it('sends a first-time user to the chooser', () => {
      expect(postLoginRoute()).toBe('/choose');
    });

    it('sends a returning user straight to their experience', () => {
      useModeStore.getState().setMode('assistant');
      expect(postLoginRoute()).toBe('/agent');

      useModeStore.getState().setMode('studio');
      expect(postLoginRoute()).toBe('/dashboard');
    });
  });
});
