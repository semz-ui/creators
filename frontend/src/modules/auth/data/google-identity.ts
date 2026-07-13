/**
 * Thin wrapper around the Google Identity Services (GIS) script:
 * https://developers.google.com/identity/gsi/web. The script is loaded on
 * demand so pages without the button ship nothing Google-related.
 */

export interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleButtonOptions {
  type: 'standard';
  theme: 'outline' | 'filled_blue' | 'filled_black';
  size: 'large' | 'medium' | 'small';
  text: 'signin_with' | 'signup_with' | 'continue_with';
  logo_alignment: 'left' | 'center';
  width: number;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

// GIS clamps the button width to [200, 400] px.
const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;

let scriptLoad: Promise<void> | null = null;

/** Load the GIS script (once) and resolve with its `google.accounts.id` API. */
async function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  const loaded = window.google?.accounts?.id;
  if (loaded) return loaded;

  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Drop the cached promise so a later mount can retry the download.
      scriptLoad = null;
      script.remove();
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  await scriptLoad;

  const api = window.google?.accounts?.id;
  if (!api) throw new Error('Google Identity Services loaded without accounts.id');
  return api;
}

/**
 * Render the official "Continue with Google" button into `container` and call
 * `onIdToken` with the Google ID token once the user completes the flow.
 */
export async function renderGoogleButton(
  container: HTMLElement,
  clientId: string,
  onIdToken: (idToken: string) => void,
): Promise<void> {
  const accountsId = await loadGoogleIdentity();
  accountsId.initialize({
    client_id: clientId,
    callback: (response) => onIdToken(response.credential),
  });
  const containerWidth = Math.round(container.getBoundingClientRect().width) || MAX_BUTTON_WIDTH;
  accountsId.renderButton(container, {
    type: 'standard',
    theme: 'filled_black',
    size: 'large',
    text: 'continue_with',
    logo_alignment: 'center',
    width: Math.min(Math.max(containerWidth, MIN_BUTTON_WIDTH), MAX_BUTTON_WIDTH),
  });
}
