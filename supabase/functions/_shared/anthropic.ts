/**
 * Anthropic Claude API Utilities for Edge Functions
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const ANTHROPIC_VERSION = '2023-06-01';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequestOptions {
  model?: string;
  maxTokens?: number;
  system?: string;
  temperature?: number;
}

interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Get Anthropic API key from environment
 */
export function getAnthropicApiKey(): string {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return apiKey;
}

/**
 * Call Claude API with messages
 */
export async function callClaude(
  messages: ClaudeMessage[],
  options: ClaudeRequestOptions = {}
): Promise<string> {
  const apiKey = getAnthropicApiKey();

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.maxTokens || 2000,
      system: options.system,
      temperature: options.temperature,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Claude API error:', error);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const result: ClaudeResponse = await response.json();
  return result.content[0].text;
}

/**
 * Call Claude for JSON response
 */
export async function callClaudeJson<T>(
  messages: ClaudeMessage[],
  options: ClaudeRequestOptions = {}
): Promise<T> {
  const text = await callClaude(messages, options);

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Build analysis prompt for conversation
 */
export function buildAnalysisPrompt(
  conversation: string,
  systemPrompt: string
): ClaudeMessage[] {
  return [
    {
      role: 'user',
      content: `以下の会話を分析してください:\n\n${conversation}`,
    },
  ];
}

/**
 * Format conversation for Claude
 */
export function formatConversation(
  segments: Array<{ speaker: string; text: string }>
): string {
  return segments
    .map((s) => {
      const label = s.speaker === 'stylist' ? '美容師' : s.speaker === 'customer' ? 'お客様' : '不明';
      return `[${label}] ${s.text}`;
    })
    .join('\n');
}
