/** Turns text into spoken-word audio (mp3 bytes) for video narration. */
export interface ISpeechSynthesizer {
  synthesize(text: string, voice: string): Promise<Buffer>;
}
