import { describe, expect, it } from 'vitest';

import type { ToolResult } from '../data/agent.types';
import { parseToolResult } from './parse-tool-result';

const result = (content: string, isError = false): ToolResult => ({
  toolUseId: 'call-1',
  content,
  isError,
});

describe('parseToolResult', () => {
  it('surfaces a generated video so the chip can link to it', () => {
    const parsed = parseToolResult(
      result('{"video":{"id":"vid-1","status":"processing"},"note":"still generating"}'),
    );
    expect(parsed.videoId).toBe('vid-1');
    expect(parsed.detail).toBe('Video processing');
  });

  it('lifts a video out so it can be rendered inline', () => {
    const parsed = parseToolResult(
      result(
        '{"video":{"id":"vid-1","status":"ready","prompt":"neon city","durationSeconds":15,"resultUrl":"https://cdn/v.mp4","error":null}}',
      ),
    );
    expect(parsed.videos).toEqual([
      {
        id: 'vid-1',
        status: 'ready',
        prompt: 'neon city',
        durationSeconds: 15,
        resultUrl: 'https://cdn/v.mp4',
        error: null,
      },
    ]);
  });

  it('lifts out every video in a list', () => {
    const parsed = parseToolResult(
      result('{"videos":[{"id":"a","status":"ready"},{"id":"b","status":"queued"}]}'),
    );
    expect(parsed.detail).toBe('2 videos');
    expect(parsed.videos.map((video) => video.id)).toEqual(['a', 'b']);
  });

  it('skips a video it cannot identify or whose status it does not know', () => {
    const parsed = parseToolResult(
      result('{"videos":[{"status":"ready"},{"id":"b","status":"transcoding"},{"id":"c"}]}'),
    );
    expect(parsed.detail).toBe('3 videos');
    expect(parsed.videos).toEqual([]);
  });

  it('surfaces a publication', () => {
    const parsed = parseToolResult(
      result('{"publication":{"id":"pub-1","videoId":"vid-1","status":"completed"}}'),
    );
    expect(parsed.publicationId).toBe('pub-1');
    expect(parsed.videoId).toBe('vid-1');
    expect(parsed.detail).toBe('Publication completed');
  });

  it('counts only active connections', () => {
    const parsed = parseToolResult(
      result('{"connections":[{"status":"active"},{"status":"expired"}]}'),
    );
    expect(parsed.detail).toBe('1 account ready to post to');
  });

  it('passes an error result through as its own message', () => {
    const parsed = parseToolResult(result('Insufficient credits', true));
    expect(parsed.detail).toBe('Insufficient credits');
    expect(parsed.videoId).toBeNull();
  });

  it('degrades quietly on content that is not JSON', () => {
    expect(parseToolResult(result('not json at all'))).toEqual({
      detail: null,
      videoId: null,
      publicationId: null,
      videos: [],
    });
  });
});
