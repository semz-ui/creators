import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Which experience the user works in: the chat assistant, or the full studio. */
export type AppMode = 'assistant' | 'studio';

export interface ModeState {
  /** Null until the user has picked, which is what sends them to /choose. */
  mode: AppMode | null;
  setMode: (mode: AppMode) => void;
  clear: () => void;
}

/**
 * The user's chosen experience, persisted so the choice is only asked for once.
 *
 * Cleared on logout: `reelo.session` is not user-scoped, so a preference left
 * behind would follow the next person to sign in on the same browser.
 */
export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: null,
      setMode: (mode) => set({ mode }),
      clear: () => set({ mode: null }),
    }),
    { name: 'reelo.mode' },
  ),
);

/** Landing route for a mode; the home of each experience. */
export function routeForMode(mode: AppMode): string {
  return mode === 'assistant' ? '/agent' : '/dashboard';
}

/**
 * Where to send someone who has just authenticated — straight to the
 * experience they chose last time, or to the chooser if they haven't picked.
 */
export function postLoginRoute(): string {
  const { mode } = useModeStore.getState();
  return mode ? routeForMode(mode) : '/choose';
}
