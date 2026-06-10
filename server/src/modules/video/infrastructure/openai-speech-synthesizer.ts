import type { ISpeechSynthesizer } from '../domain/ports/speech-synthesizer';

export interface OpenAiSpeechConfig {
  apiKey: string;
  /** TTS model, e.g. gpt-4o-mini-tts or tts-1. */
  model: string;
  /** API host, e.g. https://api.openai.com/v1. */
  baseUrl: string;
}

/**
 * OpenAI text-to-speech ({@link https://platform.openai.com/docs/api-reference/audio/createSpeech}).
 * Returns mp3 bytes for the given text + voice, which the compositor uploads and
 * overlays onto the video.
 */
export class OpenAiSpeechSynthesizer implements ISpeechSynthesizer {
  constructor(private readonly config: OpenAiSpeechConfig) {}

  async synthesize(text: string, voice: string): Promise<Buffer> {
    const res = await fetch(`${this.config.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        voice,
        input: text,
        response_format: 'mp3',
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI TTS error (HTTP ${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
