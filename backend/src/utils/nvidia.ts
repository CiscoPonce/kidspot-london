/**
 * NVIDIA API LLM client for contact extraction fallback.
 *
 * The stepfun-ai/step-3.7-flash model returns assistant output in
 * chunk.choices[0].delta.reasoning / chunk.choices[0].delta.reasoning_content
 * — NOT in chunk.choices[0].message.content (which is always null).
 *
 * Environment variables consumed (all defined in backend/src/config/env.ts):
 *   NVIDIA_API_KEY, NVIDIA_MODEL, NVIDIA_MAX_TOKENS, NVIDIA_TEMPERATURE,
 *   NVIDIA_TOP_P, NVIDIA_BASE_URL
 */

import env from '../config/env.js';

export interface CallNvidiaOptions {
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
}

/**
 * Call the NVIDIA API chat completions endpoint and return the assistant text.
 *
 * Accumulates reasoning / reasoning_content tokens across streaming chunks.
 * Falls back to reading message.content only if reasoning tokens are absent
 * (defensive: the configured model always returns reasoning tokens, but we
 * handle edge cases gracefully).
 *
 * @throws Error on non-2xx responses or network failures.
 */
export async function callNvidia({
  systemPrompt,
  userPrompt,
  signal,
}: CallNvidiaOptions): Promise<string> {
  const url = `${env.NVIDIA_BASE_URL}/chat/completions`;

  const body = {
    model: env.NVIDIA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: env.NVIDIA_MAX_TOKENS,
    temperature: env.NVIDIA_TEMPERATURE,
    top_p: env.NVIDIA_TOP_P,
    stream: true,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `NVIDIA API returned ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  // Accumulate reasoning tokens across SSE chunks
  let accumulated = '';

  const reader = response.body?.getReader();
  if (!reader) {
    // Fallback: body was not streamed (shouldn't happen with stream:true)
    const rawJson = (await response.json().catch(() => ({}))) as { choices?: { delta?: Record<string, unknown> }[] };
    const delta = rawJson?.choices?.[0]?.delta ?? {};
    // This model ALWAYS returns reasoning/reasoning_content; content is always null.
    // Use content as last resort only if neither reasoning field is present.
    accumulated = (delta.reasoning as string | undefined) ?? (delta.reasoning_content as string | undefined) ?? (delta.content as string | undefined) ?? '';
    return accumulated.trim();
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Keep the last fragment (may be incomplete SSE line)
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;

      try {
        const chunk = JSON.parse(payload);
        const delta: Record<string, string | undefined> =
          chunk?.choices?.[0]?.delta ?? {};
        accumulated +=
          (delta.reasoning as string | undefined) ??
          (delta.reasoning_content as string | undefined) ??
          '';
      } catch {
        // Ignore unparseable SSE payloads
      }
    }
  }

  return accumulated.trim();
}
