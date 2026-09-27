import { randomUUID } from 'node:crypto';

import { PLATFORMS } from '@modules/connections/domain/platform';

import type { AgentContentBlock, AgentMessage } from '../domain/agent-message';
import { messageText, textBlock } from '../domain/agent-message';
import type { AgentTurnRequest, AgentTurnResponse, IAgentModel } from '../domain/ports/agent-model';

const DEFAULT_DURATION = 15;
const MIN_DURATION = 5;
const MAX_DURATION = 60;

const GENERATE_WORDS = /\b(generate|create|make|produce|film|shoot)\b/i;
const PUBLISH_WORDS = /\b(publish|post|share|upload)\b/i;
const CONNECTION_WORDS = /\b(connect|connection|account|linked)\b/i;
const STATUS_WORDS = /\b(status|ready|done|finished|progress)\b/i;

/**
 * Deterministic stand-in used whenever `ANTHROPIC_API_KEY` is absent — the same
 * dual-mode convention as the video generators and social publishers.
 *
 * It is keyword-driven rather than intelligent, but it exercises every path
 * that matters: tool calls, tool results, and the confirmation pause on
 * publishing. That keeps the whole feature usable on the free demo and makes
 * the e2e tests deterministic.
 */
export class StubAgentModel implements IAgentModel {
  async complete(request: AgentTurnRequest): Promise<AgentTurnResponse> {
    const content = this.respond(request.messages);
    return {
      content,
      stopReason: content.some((block) => block.type === 'tool_use') ? 'tool_use' : 'end_turn',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  private respond(messages: AgentMessage[]): AgentContentBlock[] {
    const last = messages[messages.length - 1];
    if (!last) return [textBlock('Tell me what video you would like to make.')];

    // A turn that ends in tool results is the agent reporting back.
    const results = last.content.filter(
      (block): block is Extract<AgentContentBlock, { type: 'tool_result' }> =>
        block.type === 'tool_result',
    );
    if (results.length > 0) return [textBlock(summarizeResults(results))];

    const text = messageText(last);

    if (PUBLISH_WORDS.test(text)) {
      const videoId = latestVideoId(messages);
      if (!videoId) {
        return [textBlock('Which video should I publish? I can list your recent ones.')];
      }
      const platforms = PLATFORMS.filter((platform) =>
        new RegExp(`\\b${platform}\\b`, 'i').test(text),
      );
      return [
        toolUse('publish_video', {
          videoId,
          platforms: platforms.length > 0 ? [...platforms] : ['tiktok'],
        }),
      ];
    }

    if (GENERATE_WORDS.test(text)) {
      return [toolUse('generate_video', { prompt: text, durationSeconds: parseDuration(text) })];
    }

    if (CONNECTION_WORDS.test(text)) {
      return [toolUse('list_connections', {})];
    }

    if (STATUS_WORDS.test(text)) {
      const videoId = latestVideoId(messages);
      if (videoId) return [toolUse('get_video', { videoId })];
      return [toolUse('list_videos', {})];
    }

    return [
      textBlock(
        'I can generate a video from a prompt and publish it to your connected accounts. Try "make a 15 second neon city clip".',
      ),
    ];
  }
}

function toolUse(name: string, input: Record<string, unknown>): AgentContentBlock {
  return { type: 'tool_use', id: `toolu_stub_${randomUUID()}`, name, input };
}

function parseDuration(text: string): number {
  const match = /(\d{1,3})\s*(?:s\b|sec|second)/i.exec(text);
  if (!match?.[1]) return DEFAULT_DURATION;
  const seconds = Number.parseInt(match[1], 10);
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, seconds));
}

/** Newest video id mentioned by any earlier tool result. */
function latestVideoId(messages: AgentMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) continue;

    for (const block of message.content) {
      if (block.type !== 'tool_result' || block.isError) continue;
      const payload = safeParse(block.content);
      const id = readVideoId(payload);
      if (id) return id;
    }
  }
  return null;
}

function readVideoId(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const record = payload as Record<string, unknown>;

  const single = record.video;
  if (typeof single === 'object' && single !== null) {
    const id = (single as Record<string, unknown>).id;
    if (typeof id === 'string') return id;
  }

  const list = record.videos;
  if (Array.isArray(list) && list.length > 0) {
    const first = list[0] as Record<string, unknown> | undefined;
    if (first && typeof first.id === 'string') return first.id;
  }
  return null;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function summarizeResults(results: Extract<AgentContentBlock, { type: 'tool_result' }>[]): string {
  const failed = results.find((result) => result.isError);
  if (failed) return `That didn't work: ${failed.content}`;

  const payloads = results.map((result) => safeParse(result.content));

  for (const payload of payloads) {
    if (typeof payload !== 'object' || payload === null) continue;
    const record = payload as Record<string, unknown>;

    if (record.publication) {
      return 'Done — the post is on its way. You can follow its status from the publications list.';
    }
    if (record.video && record.note) {
      return "Your video is generating now. It usually takes a minute — ask me for the status and I'll check.";
    }
    if (record.video) {
      const video = record.video as Record<string, unknown>;
      return `That video is currently "${String(video.status)}".`;
    }
    if (Array.isArray(record.connections)) {
      const active = record.connections.filter(
        (item) => (item as Record<string, unknown>).status === 'active',
      );
      return active.length > 0
        ? `You have ${active.length} account(s) ready to post to.`
        : 'You have no active connections yet — connect an account first.';
    }
    if (Array.isArray(record.videos)) {
      return `You have ${record.videos.length} recent video(s).`;
    }
  }
  return 'Done.';
}
