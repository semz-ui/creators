import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderGoogleButton, type GoogleCredentialResponse } from './google-identity';

describe('renderGoogleButton', () => {
  afterEach(() => {
    delete window.google;
  });

  it('initializes GIS with the client ID and renders the button', async () => {
    const initialize = vi.fn();
    const renderButton = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton } } };

    const container = document.createElement('div');
    const onIdToken = vi.fn();
    await renderGoogleButton(container, 'client-123', onIdToken);

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'client-123', callback: expect.any(Function) }),
    );
    expect(renderButton).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ type: 'standard', text: 'continue_with' }),
    );
    // jsdom reports zero width; the button must still get a valid GIS width.
    const [, options] = renderButton.mock.calls[0] as [HTMLElement, { width: number }];
    expect(options.width).toBeGreaterThanOrEqual(200);
    expect(options.width).toBeLessThanOrEqual(400);
  });

  it('passes the credential from the GIS callback through to onIdToken', async () => {
    const initialize = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton: vi.fn() } } };

    const onIdToken = vi.fn();
    await renderGoogleButton(document.createElement('div'), 'client-123', onIdToken);

    const [config] = initialize.mock.calls[0] as [
      { callback: (response: GoogleCredentialResponse) => void },
    ];
    config.callback({ credential: 'google-id-token' });

    expect(onIdToken).toHaveBeenCalledWith('google-id-token');
  });
});
